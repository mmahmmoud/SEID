import { prisma } from "@/lib/prisma";
import { generateSuggestions } from "../../../lib/bankMatcher";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const { bankTransactionId, refresh } = req.query;
  if (!bankTransactionId) return res.status(400).json({ message: "bankTransactionId required" });

  try {
    const txId = String(bankTransactionId);

    // Optionally regenerate
    if (refresh === "1") {
      const fresh = await generateSuggestions(txId);
      return res.status(200).json(fresh);
    }

    // Return stored suggestions enriched with entity data
    const suggestions = await prisma.matchingSuggestion.findMany({
      where: { bankTransactionId: txId },
      orderBy: { score: "desc" },
    });

    const enriched = await Promise.all(
      suggestions.map(async (s) => {
        let entity: any = null;
        if (s.entityType === "invoice") {
          entity = await prisma.invoice.findUnique({
            where: { id: s.entityId },
            include: { client: { select: { name: true } } },
          });
          if (entity) {
            entity = {
              id: entity.id,
              label: `Invoice #${entity.id.slice(0, 8).toUpperCase()}`,
              name: entity.client?.name || "",
              amount: Number(entity.total),
              date: entity.createdAt,
              status: entity.status,
            };
          }
        } else if (s.entityType === "expense") {
          entity = await (prisma as any).expense.findUnique({ where: { id: s.entityId } });
          if (entity) {
            entity = {
              id: entity.id,
              label: entity.title,
              name: entity.category,
              amount: entity.amount,
              date: entity.date,
              status: entity.paymentMethod || "",
            };
          }
        }
        return { ...s, entity };
      })
    );

    // If no stored suggestions, generate on demand
    if (enriched.length === 0) {
      const generated = await generateSuggestions(txId);
      return res.status(200).json(generated);
    }

    return res.status(200).json(enriched.filter((s) => s.entity));
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}


