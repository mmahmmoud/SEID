import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  try {
    if (req.method === "GET") {
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          inventoryLogs: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      });
      if (!product) return res.status(404).json({ message: "Not found" });
      return res.status(200).json({ ...product, isLowStock: product.stockQuantity <= product.lowStockAlert });
    }

    if (req.method === "PUT") {
      const { name, sku, description, sellingPrice, costPrice, lowStockAlert, unit, isActive } =
        req.body;
      const product = await prisma.product.update({
        where: { id },
        data: {
          name,
          sku,
          description,
          sellingPrice: Number(sellingPrice),
          costPrice: Number(costPrice),
          lowStockAlert: Number(lowStockAlert),
          unit,
          isActive,
        },
      });
      return res.status(200).json(product);
    }

    if (req.method === "DELETE") {
      await prisma.product.update({ where: { id }, data: { isActive: false } });
      return res.status(204).end();
    }

    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}
