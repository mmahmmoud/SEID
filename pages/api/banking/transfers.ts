import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

function cuid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const transfers = await prisma.bankTransfer.findMany({
        orderBy: { date: "desc" },
        take: 100,
      });
      // Enrich with account names
      const accounts = await prisma.bankAccount.findMany({ select: { id: true, name: true, bankName: true } });
      const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a]));
      return res.status(200).json(
        transfers.map((t) => ({
          ...t,
          fromAccount: t.fromBankAccountId ? accountMap[t.fromBankAccountId] : null,
          toAccount: t.toBankAccountId ? accountMap[t.toBankAccountId] : null,
        }))
      );
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }

  if (req.method !== "POST") return res.status(405).end();

  const { type, amount, date, description, fromBankAccountId, toBankAccountId } = req.body;

  if (!type || !amount || !date)
    return res.status(400).json({ message: "type, amount, date are required" });

  const amt = Number(amount);
  const txDate = new Date(date);
  const desc = description || `${type} transfer`;

  try {
    const transferId = cuid();

    if (type === "internal") {
      // Both accounts required
      if (!fromBankAccountId || !toBankAccountId)
        return res.status(400).json({ message: "Both fromBankAccountId and toBankAccountId are required for internal transfer" });
      if (fromBankAccountId === toBankAccountId)
        return res.status(400).json({ message: "Source and destination cannot be the same account" });

      const [fromAcc, toAcc] = await Promise.all([
        prisma.bankAccount.findUnique({ where: { id: fromBankAccountId } }),
        prisma.bankAccount.findUnique({ where: { id: toBankAccountId } }),
      ]);
      if (!fromAcc) return res.status(404).json({ message: "Source account not found" });
      if (!toAcc) return res.status(404).json({ message: "Destination account not found" });

      // Create transfer record + two transactions atomically
      const [transfer] = await prisma.$transaction([
        prisma.bankTransfer.create({
          data: { id: transferId, type, amount: amt, date: txDate, description: desc, fromBankAccountId, toBankAccountId },
        }),
        prisma.bankTransaction.create({
          data: {
            bankAccountId: fromBankAccountId,
            date: txDate,
            description: `Transfer to ${toAcc.name}: ${desc}`,
            amount: amt,
            type: "debit",
            reference: `TRF-${transferId.slice(0, 8).toUpperCase()}`,
            status: "matched",
            source: "transfer",
            remainingAmount: 0,
            transferId,
          },
        }),
        prisma.bankTransaction.create({
          data: {
            bankAccountId: toBankAccountId,
            date: txDate,
            description: `Transfer from ${fromAcc.name}: ${desc}`,
            amount: amt,
            type: "credit",
            reference: `TRF-${transferId.slice(0, 8).toUpperCase()}`,
            status: "matched",
            source: "transfer",
            remainingAmount: 0,
            transferId,
          },
        }),
        prisma.bankAccount.update({
          where: { id: fromBankAccountId },
          data: { currentBalance: { decrement: amt } },
        }),
        prisma.bankAccount.update({
          where: { id: toBankAccountId },
          data: { currentBalance: { increment: amt } },
        }),
      ]);

      return res.status(201).json(transfer);
    }

    // Incoming or outgoing manual
    if (type === "incoming") {
      if (!toBankAccountId) return res.status(400).json({ message: "toBankAccountId required for incoming" });
      const acc = await prisma.bankAccount.findUnique({ where: { id: toBankAccountId } });
      if (!acc) return res.status(404).json({ message: "Account not found" });

      const [transfer] = await prisma.$transaction([
        prisma.bankTransfer.create({
          data: { id: transferId, type, amount: amt, date: txDate, description: desc, toBankAccountId },
        }),
        prisma.bankTransaction.create({
          data: {
            bankAccountId: toBankAccountId,
            date: txDate,
            description: desc,
            amount: amt,
            type: "credit",
            reference: `TRF-${transferId.slice(0, 8).toUpperCase()}`,
            status: "unmatched",
            source: "manual",
            remainingAmount: amt,
            transferId,
          },
        }),
        prisma.bankAccount.update({
          where: { id: toBankAccountId },
          data: { currentBalance: { increment: amt } },
        }),
      ]);
      return res.status(201).json(transfer);
    }

    if (type === "outgoing") {
      if (!fromBankAccountId) return res.status(400).json({ message: "fromBankAccountId required for outgoing" });
      const acc = await prisma.bankAccount.findUnique({ where: { id: fromBankAccountId } });
      if (!acc) return res.status(404).json({ message: "Account not found" });

      const [transfer] = await prisma.$transaction([
        prisma.bankTransfer.create({
          data: { id: transferId, type, amount: amt, date: txDate, description: desc, fromBankAccountId },
        }),
        prisma.bankTransaction.create({
          data: {
            bankAccountId: fromBankAccountId,
            date: txDate,
            description: desc,
            amount: amt,
            type: "debit",
            reference: `TRF-${transferId.slice(0, 8).toUpperCase()}`,
            status: "unmatched",
            source: "manual",
            remainingAmount: amt,
            transferId,
          },
        }),
        prisma.bankAccount.update({
          where: { id: fromBankAccountId },
          data: { currentBalance: { decrement: amt } },
        }),
      ]);
      return res.status(201).json(transfer);
    }

    return res.status(400).json({ message: "Invalid type. Use: incoming | outgoing | internal" });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}


