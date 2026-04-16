import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const { productId, type, limit = 100 } = req.query;
      const where: any = {};
      if (productId) where.productId = String(productId);
      if (type) where.type = String(type);

      const logs = await prisma.inventoryLog.findMany({
        where,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: { product: { select: { id: true, name: true, sku: true } } },
      });
      return res.status(200).json(logs);
    }
    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}


