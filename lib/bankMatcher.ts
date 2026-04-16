import { prisma } from "./prisma";

export interface MatchCandidate {
  entityType: "invoice" | "expense";
  entityId: string;
  entityAmount: number;
  entityDate: Date;
  entityRef: string;
  entityName: string;
  score: number;
  breakdown: Record<string, number>;
}

function daysDiff(a: Date, b: Date): number {
  return Math.abs((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function normalise(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function referenceScore(txDesc: string, txRef: string | null, entityRef: string): number {
  const haystack = normalise(txDesc + " " + (txRef || ""));
  const needle = normalise(entityRef);
  if (!needle) return 0;
  if (haystack.includes(needle)) return 30;
  // Partial: at least 4 chars matching
  for (let i = 0; i <= needle.length - 4; i++) {
    if (haystack.includes(needle.slice(i, i + 4))) return 10;
  }
  return 0;
}

function nameScore(txDesc: string, entityName: string): number {
  const words = normalise(entityName).split(/\s+/).filter((w) => w.length > 3);
  const haystack = normalise(txDesc);
  let hits = 0;
  for (const w of words) if (haystack.includes(w)) hits++;
  if (!words.length) return 0;
  const ratio = hits / words.length;
  return ratio >= 0.5 ? 10 : ratio > 0 ? 5 : 0;
}

function amountScore(txAmount: number, remaining: number, entityAmount: number): number {
  if (Math.abs(txAmount - entityAmount) < 0.01) return 50;
  if (Math.abs(remaining - entityAmount) < 0.01) return 45;
  const ratio = Math.min(remaining, entityAmount) / Math.max(remaining, entityAmount);
  if (ratio >= 0.9) return 30;
  if (ratio >= 0.7) return 15;
  return 0;
}

function dateScore(txDate: Date, entityDate: Date): number {
  const d = daysDiff(txDate, entityDate);
  if (d <= 3) return 10;
  if (d <= 7) return 5;
  if (d <= 14) return 2;
  return 0;
}

export async function generateSuggestions(
  bankTransactionId: string
): Promise<MatchCandidate[]> {
  const tx = await prisma.bankTransaction.findUnique({
    where: { id: bankTransactionId },
  });
  if (!tx) return [];

  const txDate = new Date(tx.date);
  const remaining = tx.remainingAmount;
  const candidates: MatchCandidate[] = [];

  // ── Match against invoices (credit transactions → sales receipts) ───────────
  if (tx.type === "credit") {
    const invoices = await prisma.invoice.findMany({
      where: { status: { in: ["UNPAID", "PARTIAL"] } },
      include: { client: true },
    });
    for (const inv of invoices) {
      const invTotal = Number(inv.total);
      const invRef = inv.id.slice(0, 8).toUpperCase();
      const scores = {
        amount: amountScore(tx.amount, remaining, invTotal),
        reference: referenceScore(tx.description, tx.reference, invRef),
        date: dateScore(txDate, new Date(inv.createdAt)),
        name: nameScore(tx.description, inv.client?.name || ""),
      };
      const total = Object.values(scores).reduce((a, b) => a + b, 0);
      if (total >= 60) {
        candidates.push({
          entityType: "invoice",
          entityId: inv.id,
          entityAmount: invTotal,
          entityDate: new Date(inv.createdAt),
          entityRef: invRef,
          entityName: inv.client?.name || "",
          score: total,
          breakdown: scores,
        });
      }
    }
  }

  // ── Match against expenses (debit transactions → outgoing payments) ─────────
  if (tx.type === "debit") {
    const expenses = await (prisma as any).expense.findMany({
      where: {},
    });
    for (const exp of expenses) {
      const scores = {
        amount: amountScore(tx.amount, remaining, exp.amount),
        reference: referenceScore(tx.description, tx.reference, exp.title),
        date: dateScore(txDate, new Date(exp.date)),
        name: nameScore(tx.description, exp.title),
      };
      const total = Object.values(scores).reduce((a, b) => a + b, 0);
      if (total >= 60) {
        candidates.push({
          entityType: "expense",
          entityId: exp.id,
          entityAmount: exp.amount,
          entityDate: new Date(exp.date),
          entityRef: exp.title,
          entityName: exp.category,
          score: total,
          breakdown: scores,
        });
      }
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Persist suggestions (upsert pattern — delete old, insert new)
  await prisma.matchingSuggestion.deleteMany({ where: { bankTransactionId } });
  if (candidates.length > 0) {
    await prisma.matchingSuggestion.createMany({
      data: candidates.slice(0, 5).map((c) => ({
        id: `${bankTransactionId}-${c.entityId}`,
        bankTransactionId,
        entityType: c.entityType,
        entityId: c.entityId,
        score: c.score,
        isSelected: false,
      })),
    });
  }

  return candidates;
}
