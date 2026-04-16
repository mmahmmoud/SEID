import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: any, res: any) {
  const { id } = req.query;
  if (typeof id !== "string") return res.status(400).json({ message: "Invalid id" });

  if (req.method === "PUT") {
    const { status, items } = req.body;
    try {
      if (items && Array.isArray(items) && items.length > 0) {
        const subTotal = items.reduce(
          (sum: number, i: any) => sum + Number(i.price) * Number(i.quantity), 0
        );
        const tax = items.reduce(
          (sum: number, i: any) =>
            sum + Number(i.price) * Number(i.quantity) * ((Number(i.tax) || 0) / 100), 0
        );
        const total = subTotal + tax;

        await prisma.quotation.update({
          where: { id },
          data: {
            status,
            subTotal,
            tax,
            total,
            items: {
              deleteMany: {},
              create: items.map((i: any, idx: number) => ({
                name:      i.name,
                quantity:  Number(i.quantity),
                price:     Number(i.price),
                tax:       Number(i.tax) || 0,
                section:   i.section || "General",
                sortOrder: i.sortOrder ?? idx,
              })),
            },
          },
        });
      } else {
        await prisma.quotation.update({ where: { id }, data: { status } });
      }
      return res.status(200).json({ message: "Quotation updated" });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: "Failed to update quotation" });
    }
  }

  if (req.method === "DELETE") {
    try {
      await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
      await prisma.quotation.delete({ where: { id } });
      return res.status(200).json({ message: "Quotation deleted" });
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to delete quotation" });
    }
  }

  res.setHeader("Allow", ["PUT", "DELETE"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
