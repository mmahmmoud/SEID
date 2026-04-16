import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const {
      bankAccountId, type, status, dateFrom, dateTo,
      page = "1", limit = "50", search,
    } = req.query;

    const where: any = {};
    if (bankAccountId) where.bankAccountId = String(bankAccountId);
    if (type) where.type = String(type);
    if (status) where.status = String(status);
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(String(dateFrom));
      if (dateTo) where.date.lte = new Date(String(dateTo) + "T23:59:59");
    }
    if (search) {
      where.OR = [
        { description: { contains: String(search) } },
        { reference: { contains: String(search) } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [transactions, total] = await prisma.$transaction([
      prisma.bankTransaction.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { date: "desc" },
        include: {
          bankAccount: { select: { id: true, name: true, bankName: true, currency: true } },
          reconciliations: true,
        },
      }),
      prisma.bankTransaction.count({ where }),
    ]);

    return res.status(200).json({ transactions, total });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}


