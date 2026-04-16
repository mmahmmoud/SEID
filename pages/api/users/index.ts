import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json(users);
    }

    if (req.method === "POST") {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email and password are required" });
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(400).json({ message: "Email already in use" });

      const hashed = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { name, email, password: hashed, role: role || "accountant" },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });
      return res.status(201).json(user);
    }

    return res.status(405).end();
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}


