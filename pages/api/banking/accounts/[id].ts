import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  try {
    if (req.method === "GET") {
      const account = await prisma.bankAccount.findUnique({
        where: { id },
        include: { _count: { select: { transactions: true } } },
      });
      if (!account) return res.status(404).json({ message: "Not found" });
      return res.status(200).json(account);
    }

    if (req.method === "PUT") {
      const { name, bankName, accountNumber, currency } = req.body;
      const account = await prisma.bankAccount.update({
        where: { id },
        data: { name, bankName, accountNumber, currency },
      });
      return res.status(200).json(account);
    }

    if (req.method === "DELETE") {
      await prisma.bankAccount.update({ where: { id }, data: { isActive: false } });
      return res.status(204).end();
    }

    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}
