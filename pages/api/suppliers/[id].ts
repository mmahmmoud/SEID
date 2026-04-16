import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  try {
    if (req.method === "GET") {
      const supplier = await prisma.supplier.findUnique({
        where: { id },
        include: {
          purchases: { orderBy: { createdAt: "desc" }, take: 10 },
        },
      });
      if (!supplier) return res.status(404).json({ message: "Not found" });
      return res.status(200).json(supplier);
    }

    if (req.method === "PUT") {
      const { name, email, phone, address, taxNumber } = req.body;
      const supplier = await prisma.supplier.update({
        where: { id },
        data: { name, email, phone, address, taxNumber },
      });
      return res.status(200).json(supplier);
    }

    if (req.method === "DELETE") {
      await prisma.supplier.delete({ where: { id } });
      return res.status(204).end();
    }

    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}
