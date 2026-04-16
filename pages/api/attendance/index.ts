import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req });
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  const userId = token.id as string;
  const role   = token.role as string;

  if (req.method === "GET") {
    const { date, userId: queryUser, month, page = "1", limit = "50" } = req.query;
    const targetUser = role === "admin" ? (queryUser as string | undefined) : userId;
    const where: any = {};
    if (targetUser) where.userId = targetUser;
    if (date)  where.date = String(date);
    if (month) where.date = { startsWith: String(month) };

    const [records, total] = await (prisma as any).$transaction([
      (prisma as any).attendance.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          user:   { select: { id: true, name: true, role: true } },
          _count: { select: { gpsPings: true } },
        },
      }),
      (prisma as any).attendance.count({ where }),
    ]);
    return res.status(200).json({ records, total });
  }

  if (req.method === "POST") {
    const { action, lat, lng, notes } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    if (action === "clock-in") {
      const existing = await (prisma as any).attendance.findUnique({
        where: { userId_date: { userId, date: today } },
      });
      if (existing?.clockIn) return res.status(400).json({ message: "Already clocked in today" });
      const now = new Date();
      const status = now.getHours() >= 9 ? "LATE" : "PRESENT";
      const record = await (prisma as any).attendance.upsert({
        where:  { userId_date: { userId, date: today } },
        create: { userId, date: today, clockIn: now, clockInLat: lat ? Number(lat) : null, clockInLng: lng ? Number(lng) : null, status, notes: notes || null },
        update: { clockIn: now, clockInLat: lat ? Number(lat) : null, clockInLng: lng ? Number(lng) : null, status },
      });
      return res.status(200).json(record);
    }

    if (action === "clock-out") {
      const record = await (prisma as any).attendance.findUnique({
        where: { userId_date: { userId, date: today } },
      });
      if (!record)         return res.status(400).json({ message: "Not clocked in today" });
      if (record.clockOut) return res.status(400).json({ message: "Already clocked out" });
      const updated = await (prisma as any).attendance.update({
        where: { id: record.id },
        data:  { clockOut: new Date(), clockOutLat: lat ? Number(lat) : null, clockOutLng: lng ? Number(lng) : null, notes: notes || record.notes },
      });
      return res.status(200).json(updated);
    }
    return res.status(400).json({ message: "Invalid action" });
  }

  if (req.method === "PATCH") {
    if (role !== "admin") return res.status(403).json({ message: "Admin only" });
    const { id, status, notes } = req.body;
    const updated = await (prisma as any).attendance.update({
      where: { id },
      data: { ...(status !== undefined ? { status } : {}), ...(notes !== undefined ? { notes } : {}) },
    });
    return res.status(200).json(updated);
  }

  return res.status(405).end();
}
