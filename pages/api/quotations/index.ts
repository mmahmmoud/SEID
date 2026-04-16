import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    try {
      const quotations = await prisma.quotation.findMany({
        include: { client: true, items: { orderBy: { sortOrder: "asc" } } },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json(JSON.parse(JSON.stringify(quotations)));
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }

  if (req.method === "POST") {
    const { clientId, items, status } = req.body;
    if (!clientId || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "Missing required fields" });

    const subTotal = items.reduce(
      (sum: number, i: any) => sum + Number(i.quantity) * Number(i.price || 0), 0
    );
    const tax = items.reduce(
      (sum: number, i: any) =>
        sum + Number(i.quantity) * Number(i.price || 0) * ((Number(i.tax) || 0) / 100), 0
    );
    const total = subTotal + tax;

    try {
      const quotation = await prisma.quotation.create({
        data: {
          clientId,
          subTotal,
          tax,
          total,
          status: status || "DRAFT",
          items: {
            create: items.map((i: any) => ({
              name: i.name || i.description || "Item",
              quantity: Number(i.quantity),
              price: Number(i.price || 0),
              tax: Number(i.tax) || 0,
              section: i.section || "General",
              sortOrder: Number(i.sortOrder) || 0,
            })),
          },
        },
        include: { client: true, items: { orderBy: { sortOrder: "asc" } } },
      });
      return res.status(200).json(JSON.parse(JSON.stringify(quotation)));
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: err.message });
    }
  }

  return res.status(405).end();
}


