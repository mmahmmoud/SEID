import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const { page = 1, limit = 50, category } = req.query;
      const where: any = {};
      if (category) where.category = String(category);

      const [expenses, total] = await prisma.$transaction([
        prisma.expense.findMany({
          where,
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          orderBy: { date: "desc" },
        }),
        prisma.expense.count({ where }),
      ]);

      return res.status(200).json({ expenses, total });
    }

    if (req.method === "POST") {
      const { title, category, amount, date, paymentMethod, notes } = req.body;

      if (!title || !category || !amount) {
        return res.status(400).json({ message: "title, category, and amount are required" });
      }

      const expense = await prisma.expense.create({
        data: {
          title,
          category,
          amount: Number(amount),
          date: date ? new Date(date) : new Date(),
          paymentMethod: paymentMethod || "",
          notes,
        },
      });

      return res.status(201).json(expense);
    }

    return res.status(405).end();
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}


