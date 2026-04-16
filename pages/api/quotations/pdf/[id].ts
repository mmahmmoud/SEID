import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default async function handler(req: any, res: any) {
  const { id } = req.query;
  if (typeof id !== "string") return res.status(400).json({ message: "Invalid id" });

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { client: true, items: true },
  });
  if (!quotation) return res.status(404).json({ message: "Not found" });

  // Convert Decimal fields to numbers
  const subTotal = Number(quotation.subTotal);
  const tax = Number(quotation.tax);
  const total = Number(quotation.total);

  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("My Company Name", 105, 20, { align: "center" });
  doc.setFontSize(12);
  doc.text("123 Street, City, Country", 105, 28, { align: "center" });
  doc.text("Tel: +971 123456789 | Email: info@company.com", 105, 34, { align: "center" });

  doc.setFontSize(16);
  doc.text(`Quotation #${quotation.id.slice(0, 8).toUpperCase()}`, 14, 50);
  doc.setFontSize(12);
  doc.text(`Client: ${quotation.client.name}`, 14, 58);
  doc.text(`Date: ${new Date(quotation.createdAt).toLocaleDateString()}`, 14, 64);

  autoTable(doc, {
    startY: 70,
    head: [["Item", "Qty", "Unit Price", "Amount"]],
    body: quotation.items.map((i) => [
      i.name,
      i.quantity.toString(),
      Number(i.price).toFixed(2),
      (Number(i.price) * i.quantity).toFixed(2),
    ]),
  });

  const finalY = (doc as any).lastAutoTable.finalY || 70;
  doc.text(`Subtotal: ${subTotal.toFixed(2)} AED`, 14, finalY + 10);
  doc.text(`Tax: ${tax.toFixed(2)} AED`, 14, finalY + 16);
  doc.text(`Total: ${total.toFixed(2)} AED`, 14, finalY + 22);

  const pdf = doc.output("arraybuffer");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=Quotation-${quotation.id}.pdf`);
  res.send(Buffer.from(pdf));
}
