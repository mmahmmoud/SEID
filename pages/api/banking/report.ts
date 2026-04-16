import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const { bankAccountId } = req.query;

  try {
    const where: any = {};
    if (bankAccountId) where.bankAccountId = String(bankAccountId);

    const [account, transactions] = await Promise.all([
      bankAccountId
        ? prisma.bankAccount.findUnique({ where: { id: String(bankAccountId) } })
        : null,
      prisma.bankTransaction.findMany({
        where,
        orderBy: { date: "asc" },
        select: {
          id: true, date: true, amount: true, type: true,
          status: true, description: true, bankAccountId: true,
        },
      }),
    ]);

    const totalIncoming = transactions.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
    const totalOutgoing = transactions.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);
    const totalMatched = transactions.filter((t) => t.status === "matched").reduce((s, t) => s + t.amount, 0);
    const totalUnmatched = transactions.filter((t) => t.status === "unmatched").reduce((s, t) => s + t.amount, 0);
    const totalPartial = transactions.filter((t) => t.status === "partial").reduce((s, t) => s + t.amount, 0);

    // Group by month
    const monthMap: Record<string, { month: string; credit: number; debit: number; count: number }> = {};
    for (const t of transactions) {
      const key = new Date(t.date).toISOString().slice(0, 7);
      if (!monthMap[key]) monthMap[key] = { month: key, credit: 0, debit: 0, count: 0 };
      if (t.type === "credit") monthMap[key].credit += t.amount;
      else monthMap[key].debit += t.amount;
      monthMap[key].count++;
    }
    const byMonth = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

    // Status breakdown counts
    const statusCount = {
      matched: transactions.filter((t) => t.status === "matched").length,
      partial: transactions.filter((t) => t.status === "partial").length,
      unmatched: transactions.filter((t) => t.status === "unmatched").length,
    };

    return res.status(200).json({
      account,
      currentBalance: account?.currentBalance ?? null,
      totalIncoming,
      totalOutgoing,
      totalMatched,
      totalUnmatched,
      totalPartial,
      statusCount,
      transactionCount: transactions.length,
      byMonth,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}


