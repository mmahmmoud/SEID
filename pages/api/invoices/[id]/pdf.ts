import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default async function handler(req: any, res: any) {
  const { id } = req.query;
  if (typeof id !== "string") return res.status(400).json({ message: "Invalid id" });

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { client: true, items: true },
  });
  if (!invoice) return res.status(404).json({ message: "Invoice not found" });

  const subTotal = Number(invoice.subTotal);
  const tax = Number(invoice.tax);
  const total = Number(invoice.total);

  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("My Company Name", 105, 20, { align: "center" });
  doc.setFontSize(12);
  doc.text("123 Street, City, Country", 105, 28, { align: "center" });
  doc.text("Tel: +971 123456789 | Email: info@company.com", 105, 34, { align: "center" });

  doc.setFontSize(16);
  doc.text(`Invoice #${invoice.id.slice(0, 8).toUpperCase()}`, 14, 50);
  doc.setFontSize(12);
  doc.text(`Client: ${invoice.client.name}`, 14, 58);
  doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 14, 64);
  if (invoice.dueDate) doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`, 14, 70);
  doc.text(`Status: ${invoice.status}`, 14, invoice.dueDate ? 76 : 70);

  autoTable(doc, {
    startY: 85,
    head: [["Item", "Qty", "Unit Price", "Tax", "Amount"]],
    body: invoice.items.map((i) => [
      i.name,
      i.quantity.toString(),
      `${Number(i.price).toFixed(2)} AED`,
      `${i.tax || 0}%`,
      `${(Number(i.price) * i.quantity * (1 + (i.tax || 0) / 100)).toFixed(2)} AED`,
    ]),
  });

  const finalY = (doc as any).lastAutoTable.finalY || 85;
  doc.text(`Subtotal: ${subTotal.toFixed(2)} AED`, 14, finalY + 10);
  doc.text(`Tax: ${tax.toFixed(2)} AED`, 14, finalY + 16);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${total.toFixed(2)} AED`, 14, finalY + 24);

  const pdf = doc.output("arraybuffer");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=Invoice-${invoice.id}.pdf`);
  res.send(Buffer.from(pdf));
}