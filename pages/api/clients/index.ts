import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = { api: { bodyParser: false } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === "GET") {
      const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
      return res.status(200).json(clients);
    }

    if (req.method === "POST") {
      const data = await parseForm(req);
      const name = getField(data.fields.name);
      const email = getField(data.fields.email);
      const phone = getField(data.fields.phone);
      const address = getField(data.fields.address);

      if (!name) return res.status(400).json({ message: "Name required" });

      let licenseUrl: string | null = null;
      const fileArr = data.files.license;
      const file = Array.isArray(fileArr) ? fileArr[0] : fileArr;

      if (file) {
        const allowedTypes = ["image/png", "image/jpeg", "application/pdf"];
        if (!allowedTypes.includes(file.mimetype))
          return res.status(400).json({ message: "Invalid file type" });
        if (file.size > 5 * 1024 * 1024)
          return res.status(400).json({ message: "File too large" });

        const uploadDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const ext = path.extname(file.originalFilename || ".file");
        const newName = `license_${Date.now()}${ext}`;
        const dest = path.join(uploadDir, newName);
        fs.copyFileSync(file.filepath, dest);
        licenseUrl = `/uploads/${newName}`;
      }

      const client = await prisma.client.create({
        data: { name, email, phone, address, licenseUrl },
      });

      return res.status(201).json(client);
    }

    return res.status(405).end();
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}

function getField(field: any) {
  return Array.isArray(field) ? field[0] : field;
}

function parseForm(req: NextApiRequest): Promise<any> {
  const form = formidable({ keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(req as any, (err, fields, files) =>
      err ? reject(err) : resolve({ fields, files })
    );
  });
}

