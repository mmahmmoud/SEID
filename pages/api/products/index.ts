import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const { search, lowStock } = req.query;

      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          ...(search
            ? {
                OR: [
                  { name: { contains: String(search) } },
                  { sku: { contains: String(search) } },
                ],
              }
            : {}),
        },
        orderBy: { name: "asc" },
      });

      // Annotate with lowStock flag
      const result = products.map((p) => ({
        ...p,
        isLowStock: p.stockQuantity <= p.lowStockAlert,
      }));

      if (lowStock === "true") {
        return res.status(200).json(result.filter((p) => p.isLowStock));
      }

      return res.status(200).json(result);
    }

    if (req.method === "POST") {
      const { name, sku, description, sellingPrice, costPrice, stockQuantity, lowStockAlert, unit } =
        req.body;

      if (!name || !sku) return res.status(400).json({ message: "Name and SKU required" });

      const product = await prisma.product.create({
        data: {
          name,
          sku,
          description,
          sellingPrice: Number(sellingPrice) || 0,
          costPrice: Number(costPrice) || 0,
          stockQuantity: Number(stockQuantity) || 0,
          lowStockAlert: Number(lowStockAlert) || 10,
          unit: unit || "pcs",
        },
      });
      return res.status(201).json(product);
    }

    return res.status(405).end();
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}


