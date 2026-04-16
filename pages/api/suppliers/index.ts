import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const suppliers = await prisma.supplier.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { purchases: true } } },
      });
      return res.status(200).json(suppliers);
    }

    if (req.method === "POST") {
      const { name, email, phone, address, taxNumber } = req.body;
      if (!name) return res.status(400).json({ message: "Name is required" });

      const supplier = await prisma.supplier.create({
        data: { name, email, phone, address, taxNumber },
      });
      return res.status(201).json(supplier);
    }

    return res.status(405).end();
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}


