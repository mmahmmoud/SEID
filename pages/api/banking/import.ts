import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import * as fs from "fs";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { generateSuggestions } from "../../../lib/bankMatcher";

export const config = { api: { bodyParser: false } };

function detectType(amount: number, desc: string): "credit" | "debit" {
  const lower = desc.toLowerCase();
  if (lower.includes("debit") || lower.includes("withdrawal") || lower.includes("dr ")) return "debit";
  if (lower.includes("credit") || lower.includes("deposit") || lower.includes("cr ")) return "credit";
  return amount >= 0 ? "credit" : "debit";
}

function extractReference(description: string): string | null {
  const patterns = [
    /INV[-_]?([A-Z0-9]+)/i,
    /REF[-_:]?\s*([A-Z0-9]+)/i,
    /\b([A-Z]{2,4}\d{4,10})\b/,
  ];
  for (const p of patterns) {
    const m = description.match(p);
    if (m) return m[0].toUpperCase();
  }
  return null;
}

function parseDate(raw: any): Date {
  if (!raw) return new Date();
  if (raw instanceof Date) return raw;
  // Excel serial number
  if (typeof raw === "number") {
    const d = new Date((raw - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date() : d;
}

function parseAmount(raw: any): number {
  if (typeof raw === "number") return Math.abs(raw);
  const str = String(raw).replace(/[^0-9.\-]/g, "");
  return Math.abs(parseFloat(str) || 0);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 });

  try {
    const [fields, files] = await form.parse(req);
    const bankAccountId = Array.isArray(fields.bankAccountId) ? fields.bankAccountId[0] : fields.bankAccountId;
    if (!bankAccountId) return res.status(400).json({ message: "bankAccountId is required" });

    const account = await prisma.bankAccount.findUnique({ where: { id: bankAccountId as string } });
    if (!account) return res.status(404).json({ message: "Bank account not found" });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });

    const buffer = fs.readFileSync(file.filepath);
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (rows.length === 0) return res.status(400).json({ message: "Empty file" });

    // Detect column names (flexible headers)
    const sampleKeys = Object.keys(rows[0]).map((k) => k.toLowerCase());
    const findCol = (candidates: string[]) =>
      Object.keys(rows[0]).find((k) => candidates.some((c) => k.toLowerCase().includes(c)));

    const dateCol = findCol(["date", "transaction date", "value date", "posting"]);
    const descCol = findCol(["description", "narration", "details", "particulars", "remarks"]);
    const amountCol = findCol(["amount", "credit", "debit", "sum", "value"]);
    const creditCol = findCol(["credit", "deposit", "cr"]);
    const debitCol = findCol(["debit", "withdrawal", "dr"]);
    const refCol = findCol(["reference", "ref", "cheque", "chq"]);

    let imported = 0;
    let duplicates = 0;
    let balanceDelta = 0;
    const newTxIds: string[] = [];

    for (const row of rows) {
      const rawDate = dateCol ? row[dateCol] : row[Object.keys(row)[0]];
      const rawDesc = descCol ? row[descCol] : "";
      if (!rawDesc && !rawDate) continue;

      const date = parseDate(rawDate);
      const description = String(rawDesc).trim() || "Imported transaction";

      // Determine amount and type
      let amount = 0;
      let txType: "credit" | "debit" = "credit";

      if (creditCol && debitCol) {
        const cr = parseAmount(row[creditCol]);
        const dr = parseAmount(row[debitCol]);
        if (cr > 0) { amount = cr; txType = "credit"; }
        else if (dr > 0) { amount = dr; txType = "debit"; }
      } else if (amountCol) {
        const raw = row[amountCol];
        const numVal = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[^0-9.\-]/g, ""));
        amount = Math.abs(numVal);
        txType = numVal < 0 ? "debit" : detectType(numVal, description);
      }

      if (amount === 0) continue;

      const reference = refCol ? (String(row[refCol]).trim() || null) : extractReference(description);

      // Duplicate check: same account + date + amount + description
      const existing = await prisma.bankTransaction.findFirst({
        where: {
          bankAccountId: bankAccountId as string,
          date: { gte: new Date(date.getTime() - 86400000), lte: new Date(date.getTime() + 86400000) },
          amount,
          description,
        },
      });
      if (existing) { duplicates++; continue; }

      const tx = await prisma.bankTransaction.create({
        data: {
          bankAccountId: bankAccountId as string,
          date,
          description,
          amount,
          type: txType,
          reference,
          status: "unmatched",
          source: "import",
          remainingAmount: amount,
        },
      });
      newTxIds.push(tx.id);
      balanceDelta += txType === "credit" ? amount : -amount;
      imported++;
    }

    // Update account balance
    if (balanceDelta !== 0) {
      await prisma.bankAccount.update({
        where: { id: bankAccountId as string },
        data: { currentBalance: { increment: balanceDelta } },
      });
    }

    // Generate matching suggestions async (don't block response)
    Promise.allSettled(newTxIds.map((id) => generateSuggestions(id))).catch(console.error);

    fs.unlinkSync(file.filepath);
    return res.status(200).json({ imported, duplicates, total: rows.length });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}


