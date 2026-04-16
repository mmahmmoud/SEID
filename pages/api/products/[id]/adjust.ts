import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { id } = req.query as { id: string };

  try {
    const { quantity, notes } = req.body;
    const qty = Number(quantity);
    if (isNaN(qty)) return res.status(400).json({ message: "Invalid quantity" });

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const newQty = product.stockQuantity + qty;
    if (newQty < 0) return res.status(400).json({ message: "Stock cannot go below 0" });

    await prisma.$transaction([
      prisma.product.update({ where: { id }, data: { stockQuantity: newQty } }),
      prisma.inventoryLog.create({
        data: {
          productId: id,
          type: "ADJUSTMENT",
          quantity: qty,
          notes: notes || "Manual adjustment",
        },
      }),
    ]);

    return res.status(200).json({ message: "Adjusted", newQuantity: newQty });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}
