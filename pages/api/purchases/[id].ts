import { prisma } from "@/lib/prisma";
import { receivePurchaseStock } from "../../../lib/inventory";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  try {
    if (req.method === "GET") {
      const purchase = await prisma.purchase.findUnique({
        where: { id },
        include: {
          supplier: true,
          items: { include: { product: true } },
          returns: { include: { items: true } },
        },
      });
      if (!purchase) return res.status(404).json({ message: "Not found" });
      return res.status(200).json(purchase);
    }

    if (req.method === "PATCH") {
      const { status } = req.body;
      const existing = await prisma.purchase.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ message: "Not found" });

      const updated = await prisma.purchase.update({
        where: { id },
        data: { status },
      });

      // Trigger stock increase when changing to RECEIVED
      if (status === "RECEIVED" && existing.status !== "RECEIVED") {
        await receivePurchaseStock(id);
      }

      return res.status(200).json(updated);
    }

    if (req.method === "DELETE") {
      await prisma.purchase.delete({ where: { id } });
      return res.status(204).end();
    }

    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}
