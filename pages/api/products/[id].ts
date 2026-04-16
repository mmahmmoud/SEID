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
      // Check if product has any linked history before deciding how to delete
      const [purchaseCount, invoiceCount, logCount] = await prisma.$transaction([
        prisma.purchaseItem.count({ where: { productId: id } }),
        prisma.invoiceItem.count({ where: { productId: id } }),
        prisma.inventoryLog.count({ where: { productId: id } }),
      ]);

      const hasHistory = purchaseCount > 0 || invoiceCount > 0 || logCount > 0;

      if (hasHistory) {
        // Soft delete — preserve history integrity
        await prisma.product.update({ where: { id }, data: { isActive: false } });
        return res.status(200).json({
          deleted: false,
          deactivated: true,
          message: "Product has transaction history and was deactivated instead of permanently deleted.",
        });
      }

      // No history — safe to hard delete
      await prisma.product.delete({ where: { id } });
      return res.status(200).json({ deleted: true, deactivated: false });
    }

    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}