import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { bankTransactionId, entityType, entityId, matchedAmount } = req.body;

  if (!bankTransactionId || !entityType || !entityId || !matchedAmount)
    return res.status(400).json({ message: "bankTransactionId, entityType, entityId, matchedAmount are required" });

  const amt = Number(matchedAmount);
  if (amt <= 0) return res.status(400).json({ message: "matchedAmount must be positive" });

  try {
    const tx = await prisma.bankTransaction.findUnique({
      where: { id: bankTransactionId },
      include: { reconciliations: true },
    });
    if (!tx) return res.status(404).json({ message: "Transaction not found" });
    if (tx.remainingAmount <= 0) return res.status(400).json({ message: "Transaction is already fully matched" });
    if (amt > tx.remainingAmount + 0.01)
      return res.status(400).json({ message: `Amount exceeds remaining (${tx.remainingAmount.toFixed(2)})` });

    // Compute score for audit
    let score = 0;
    if (Math.abs(amt - tx.amount) < 0.01) score = 90;
    else if (Math.abs(amt - tx.remainingAmount) < 0.01) score = 80;
    else score = 65;

    const newRemaining = Math.max(0, tx.remainingAmount - amt);
    const newStatus = newRemaining < 0.01 ? "matched" : "partial";

    const [reconciliation] = await prisma.$transaction([
      prisma.reconciliation.create({
        data: { bankTransactionId, entityType, entityId, matchedAmount: amt, score },
      }),
      prisma.bankTransaction.update({
        where: { id: bankTransactionId },
        data: { remainingAmount: newRemaining, status: newStatus },
      }),
    ]);

    // Mark suggestion as selected if exists
    await prisma.matchingSuggestion.updateMany({
      where: { bankTransactionId, entityId },
      data: { isSelected: true },
    });

    return res.status(201).json({ reconciliation, remainingAmount: newRemaining, status: newStatus });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}


