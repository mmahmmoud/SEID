import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = { api: { bodyParser: false } };

function parseForm(req: NextApiRequest): Promise<{ fields: any; files: any }> {
  const form = formidable({ keepExtensions: true, maxFileSize: 5 * 1024 * 1024 });
  return new Promise((resolve, reject) =>
    form.parse(req as any, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })))
  );
}
function f(v: any): string { return Array.isArray(v) ? v[0] : v ?? ""; }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req });
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  const userId = token.id as string;
  const role   = token.role as string;

  if (req.method === "GET") {
    const { userId: queryUser, clientId, date, month, page = "1", limit = "50" } = req.query;
    const targetUser = role === "admin" ? (queryUser as string | undefined) : userId;
    const where: any = {};
    if (targetUser) where.userId   = targetUser;
    if (clientId)   where.clientId = String(clientId);
    if (date) {
      where.visitDate = { gte: new Date(`${date}T00:00:00.000Z`), lte: new Date(`${date}T23:59:59.999Z`) };
    } else if (month) {
      const [y, m] = String(month).split("-").map(Number);
      where.visitDate = { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0, 23, 59, 59) };
    }
    const [visits, total] = await (prisma as any).$transaction([
      (prisma as any).fieldVisit.findMany({
        where,
        orderBy: { visitDate: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          user:   { select: { id: true, name: true } },
          client: { select: { id: true, name: true, phone: true, email: true } },
        },
      }),
      (prisma as any).fieldVisit.count({ where }),
    ]);
    return res.status(200).json({ visits, total });
  }

  if (req.method === "POST") {
    const { fields, files } = await parseForm(req);
    const lat      = Number(f(fields.lat));
    const lng      = Number(f(fields.lng));
    if (!lat || !lng) return res.status(400).json({ message: "GPS coordinates required" });

    let photoUrl: string | null = null;
    const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;
    if (photoFile) {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "visits");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const ext     = path.extname(photoFile.originalFilename || ".jpg");
      const newName = `visit_${Date.now()}${ext}`;
      fs.copyFileSync(photoFile.filepath, path.join(uploadDir, newName));
      photoUrl = `/uploads/visits/${newName}`;
    }

    const visit = await (prisma as any).fieldVisit.create({
      data: {
        userId,
        clientId:   f(fields.clientId)   || null,
        clientName: f(fields.clientName) || null,
        lat, lng,
        address:  f(fields.address)  || null,
        purpose:  f(fields.purpose)  || null,
        notes:    f(fields.notes)    || null,
        duration: fields.duration ? Number(f(fields.duration)) : null,
        photoUrl,
      },
      include: {
        user:   { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    });
    return res.status(201).json(visit);
  }

  if (req.method === "PATCH") {
    const { fields } = await parseForm(req);
    const id = f(fields.id);
    if (!id) return res.status(400).json({ message: "id required" });
    const visit = await (prisma as any).fieldVisit.findUnique({ where: { id } });
    if (!visit) return res.status(404).json({ message: "Not found" });
    if (role !== "admin" && visit.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    const updated = await (prisma as any).fieldVisit.update({
      where: { id },
      data: {
        ...(fields.notes    ? { notes:    f(fields.notes)              } : {}),
        ...(fields.duration ? { duration: Number(f(fields.duration))   } : {}),
        ...(fields.purpose  ? { purpose:  f(fields.purpose)            } : {}),
      },
    });
    return res.status(200).json(updated);
  }

  if (req.method === "DELETE") {
    if (role !== "admin") return res.status(403).json({ message: "Admin only" });
    const { id } = req.query;
    await (prisma as any).fieldVisit.delete({ where: { id: String(id) } });
    return res.status(204).end();
  }

  return res.status(405).end();
}
