import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import jsPDF from "jspdf";
import fs from "fs";
import path from "path";

// ─── PDF constants ─────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const CONTENT_START = 50.3;
const PAGE_BOTTOM = PAGE_H - 16;

const YELLOW = [255, 255, 0] as [number, number, number];
const YELLOW_LIGHT = [255, 255, 153] as [number, number, number];
const DARK = [20, 20, 20] as [number, number, number];
const DARK2 = [50, 50, 50] as [number, number, number];
const GRAY = [100, 100, 100] as [number, number, number];
const LGRAY = [240, 240, 235] as [number, number, number];
const WHITE = [255, 255, 255] as [number, number, number];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (typeof id !== "string") {
      return res.status(400).json({ message: "Invalid id" });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true, items: true },
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const doc = new jsPDF({ unit: "mm", format: "a4" });

    // ─── FIX: Load letterhead from filesystem (NOT Image()) ───
    const imgPath = path.join(process.cwd(), "public/letterhead.jpg");
    const imgBuffer = fs.readFileSync(imgPath);

    const addBg = () => {
      doc.addImage(imgBuffer, "JPEG", 0, 0, PAGE_W, PAGE_H);
    };

    let cursorY = CONTENT_START;

    const ensureSpace = (h: number) => {
      if (cursorY + h > PAGE_BOTTOM) {
        doc.addPage();
        addBg();
        cursorY = CONTENT_START;
      }
    };

    // ─── START PAGE ─────────────────────────────
    addBg();

    doc.setFillColor(...DARK);
    doc.roundedRect(MARGIN, cursorY, CONTENT_W, 10, 2, 2, "F");

    doc.setFillColor(...YELLOW);
    doc.roundedRect(MARGIN, cursorY, 3, 10, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...WHITE);
    doc.text("TAX INVOICE", PAGE_W / 2, cursorY + 6.8, { align: "center" });

    cursorY += 13;

    // ─── INFO ROW ─────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK2);

    doc.text(`Ref: INV-${invoice.id.slice(0, 8).toUpperCase()}`, MARGIN, cursorY);
    doc.text(
      `Date: ${new Date(invoice.createdAt).toLocaleDateString()}`,
      PAGE_W / 2,
      cursorY,
      { align: "center" }
    );
    doc.text(`Client: ${invoice.client?.name || ""}`, PAGE_W - MARGIN, cursorY, {
      align: "right",
    });

    cursorY += 6;

    doc.setDrawColor(...YELLOW);
    doc.line(MARGIN, cursorY, PAGE_W - MARGIN, cursorY);

    cursorY += 6;

    // ─── COLUMNS ─────────────────────────────
    const col = {
      desc: MARGIN + 2,
      qty: MARGIN + 100,
      price: MARGIN + 125,
      tax: MARGIN + 150,
      total: MARGIN + CONTENT_W - 2,
    };

    // ─── HEADER TABLE ─────────────────────────────
    doc.setFillColor(...LGRAY);
    doc.rect(MARGIN, cursorY, CONTENT_W, 6, "F");

    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.setFont("helvetica", "bold");

    doc.text("DESCRIPTION", col.desc, cursorY + 4);
    doc.text("QTY", col.qty, cursorY + 4, { align: "center" });
    doc.text("UNIT PRICE", col.price, cursorY + 4, { align: "right" });
    doc.text("TAX", col.tax, cursorY + 4, { align: "right" });
    doc.text("AMOUNT", col.total, cursorY + 4, { align: "right" });

    cursorY += 7;

    doc.setDrawColor(...YELLOW);
    doc.line(MARGIN, cursorY, PAGE_W - MARGIN, cursorY);

    // ─── ITEMS ─────────────────────────────
    let shade = false;
    const items = invoice.items || [];

    for (const item of items) {
      const itemTotal =
        item.quantity * Number(item.price) * (1 + (item.tax || 0) / 100);

      const lines = doc.splitTextToSize(item.name, 90);
      const rowH = Math.max(6, lines.length * 4.2 + 2);

      ensureSpace(rowH);

      if (shade) {
        doc.setFillColor(252, 250, 244);
        doc.rect(MARGIN, cursorY, CONTENT_W, rowH, "F");
      }
      shade = !shade;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...DARK2);

      doc.text(lines, col.desc, cursorY + 4);
      doc.text(String(item.quantity), col.qty, cursorY + 4, { align: "center" });
      doc.text(Number(item.price).toFixed(2), col.price, cursorY + 4, {
        align: "right",
      });
      doc.text(`${item.tax || 0}%`, col.tax, cursorY + 4, { align: "right" });
      doc.text(itemTotal.toFixed(2), col.total, cursorY + 4, {
        align: "right",
      });

      cursorY += rowH;

      doc.setDrawColor(220, 210, 185);
      doc.line(MARGIN, cursorY, PAGE_W - MARGIN, cursorY);
    }

    // ─── TOTAL BOX ─────────────────────────────
    const sub = Number(invoice.subTotal);
    const tax = Number(invoice.tax);
    const total = Number(invoice.total);

    ensureSpace(40);
    cursorY += 5;

    const boxW = 85;
    const boxX = PAGE_W - MARGIN - boxW;

    doc.setDrawColor(...YELLOW);
    doc.roundedRect(boxX, cursorY, boxW, 28, 2, 2);

    doc.setFontSize(8.5);
    doc.setTextColor(...DARK2);

    doc.text("Subtotal", boxX + 4, cursorY + 8);
    doc.text(`${sub.toFixed(2)} AED`, boxX + boxW - 4, cursorY + 8, {
      align: "right",
    });

    doc.text("Tax", boxX + 4, cursorY + 16);
    doc.text(`${tax.toFixed(2)} AED`, boxX + boxW - 4, cursorY + 16, {
      align: "right",
    });

    doc.setFillColor(...YELLOW);
    doc.rect(boxX, cursorY + 20, boxW, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text("TOTAL", boxX + 4, cursorY + 25.5);
    doc.text(`${total.toFixed(2)} AED`, boxX + boxW - 4, cursorY + 25.5, {
      align: "right",
    });

    const pdf = doc.output("arraybuffer");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Invoice-${invoice.id}.pdf`
    );

    res.send(Buffer.from(pdf));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error", error: String(err) });
  }
}