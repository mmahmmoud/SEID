import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req });
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  const userId = token.id as string;
  const role   = token.role as string;

  if (req.method === "POST") {
    const { lat, lng, accuracy } = req.body;
    if (!lat || !lng) return res.status(400).json({ message: "lat and lng required" });
    const today = new Date().toISOString().slice(0, 10);
    const attendance = await (prisma as any).attendance.findUnique({
      where: { userId_date: { userId, date: today } },
    });
    if (!attendance?.clockIn || attendance?.clockOut) {
      return res.status(400).json({ message: "Not currently clocked in" });
    }
    const ping = await (prisma as any).gPSPing.create({
      data: { userId, attendanceId: attendance.id, lat: Number(lat), lng: Number(lng), accuracy: accuracy ? Number(accuracy) : null },
    });
    return res.status(201).json(ping);
  }

  if (req.method === "GET") {
    const { attendanceId, userId: queryUser, date } = req.query;
    if (role !== "admin" && queryUser && queryUser !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const where: any = {};
    if (attendanceId) where.attendanceId = String(attendanceId);
    if (queryUser)    where.userId = String(queryUser);
    if (!queryUser && role !== "admin") where.userId = userId;
    if (date) {
      where.recordedAt = {
        gte: new Date(`${date}T00:00:00.000Z`),
        lte: new Date(`${date}T23:59:59.999Z`),
      };
    }
    const pings = await (prisma as any).gPSPing.findMany({ where, orderBy: { recordedAt: "asc" }, take: 500 });
    return res.status(200).json(pings);
  }

  return res.status(405).end();
}
