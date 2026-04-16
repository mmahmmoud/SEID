import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  try {
    if (req.method === "PUT") {
      const { name, email, role, password } = req.body;

      const data: any = { name, email, role };
      if (password && password.trim() !== "") {
        data.password = await bcrypt.hash(password, 10);
      }

      const user = await prisma.user.update({
        where: { id },
        data,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });
      return res.status(200).json(user);
    }

    if (req.method === "DELETE") {
      // Prevent deleting the last admin
      const admins = await prisma.user.count({ where: { role: "admin" } });
      const target = await prisma.user.findUnique({ where: { id } });
      if (target?.role === "admin" && admins <= 1) {
        return res.status(400).json({ message: "Cannot delete the last admin account" });
      }
      await prisma.user.delete({ where: { id } });
      return res.status(204).end();
    }

    return res.status(405).end();
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}
