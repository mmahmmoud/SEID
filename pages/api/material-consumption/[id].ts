import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  try {
    if (req.method === "GET") {
      const record = await prisma.materialConsumption.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, unit: true, stockQuantity: true },
              },
            },
          },
          inventoryLogs: {
            include: { product: { select: { id: true, name: true } } },
            orderBy:  { createdAt: "asc" },
          },
        },
      });

      if (!record) return res.status(404).json({ message: "Record not found" });
      return res.status(200).json(record);
    }

    return res.status(405).end();
  } catch (err: any) {
    console.error("[material-consumption/[id]]", err);
    return res.status(500).json({ message: err.message });
  }
}
