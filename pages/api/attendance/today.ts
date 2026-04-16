import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req });
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  if (req.method !== "GET") return res.status(405).end();

  const userId = token.id as string;
  const today  = new Date().toISOString().slice(0, 10);

  const record = await (prisma as any).attendance.findUnique({
    where: { userId_date: { userId, date: today } },
    include: { _count: { select: { gpsPings: true } } },
  });

  const todayVisits = await (prisma as any).fieldVisit.count({
    where: {
      userId,
      visitDate: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lte: new Date(`${today}T23:59:59.999Z`),
      },
    },
  });

  return res.status(200).json({
    today,
    attendance:   record ?? null,
    isClockedIn:  !!record?.clockIn && !record?.clockOut,
    isClockedOut: !!record?.clockOut,
    todayVisits,
  });
}
