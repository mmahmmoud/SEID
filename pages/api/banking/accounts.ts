import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const accounts = await prisma.bankAccount.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        include: {
          _count: { select: { transactions: true } },
        },
      });
      return res.status(200).json(accounts);
    }

    if (req.method === "POST") {
      const { name, bankName, accountNumber, currency, openingBalance } = req.body;
      if (!name || !bankName || !accountNumber)
        return res.status(400).json({ message: "name, bankName, accountNumber are required" });

      const bal = Number(openingBalance) || 0;
      const account = await prisma.bankAccount.create({
        data: { name, bankName, accountNumber, currency: currency || "AED", openingBalance: bal, currentBalance: bal },
      });
      return res.status(201).json(account);
    }

    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}


