import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  try {
    if (req.method === "GET") {
      const expense = await prisma.expense.findUnique({ where: { id } });
      if (!expense) return res.status(404).json({ message: "Not found" });
      return res.status(200).json(expense);
    }

    if (req.method === "PUT") {
      const { title, category, amount, date, paymentMethod, notes } = req.body;
      const expense = await prisma.expense.update({
        where: { id },
        data: {
          title,
          category,
          amount: Number(amount),
          date: date ? new Date(date) : undefined,
          paymentMethod: paymentMethod || "",
          notes,
        },
      });
      return res.status(200).json(expense);
    }

    if (req.method === "DELETE") {
      await prisma.expense.delete({ where: { id } });
      return res.status(204).end();
    }

    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}
