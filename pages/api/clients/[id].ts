import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { id } = req.query;
    if (typeof id !== "string") return res.status(400).json({ message: "Invalid id" });

    if (req.method === "GET") {
      const client = await prisma.client.findUnique({
        where: { id },
        include: { invoices: true, quotations: true },
      });
      if (!client) return res.status(404).json({ message: "Not found" });
      return res.status(200).json(client);
    }

    if (req.method === "PUT") {
      const { name, email, phone, address } = req.body;
      if (!name) return res.status(400).json({ message: "Name required" });

      const updated = await prisma.client.update({
        where: { id },
        data: { name, email, phone, address },
      });
      return res.status(200).json(updated);
    }

    if (req.method === "DELETE") {
      await prisma.client.delete({ where: { id } });
      return res.status(200).json({ message: "Client deleted" });
    }

    return res.status(405).end();
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}