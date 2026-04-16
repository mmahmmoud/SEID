import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

// دالة لتحويل الـ Date لـ string قبل الإرسال
function serializeQuotation(q: any) {
  return {
    ...q,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    client: q.client
      ? { ...q.client, createdAt: q.client.createdAt.toISOString() }
      : null,
    items: q.items.map((item: any) => ({
      ...item,
      price: Number(item.price),
      tax: item.tax !== undefined ? Number(item.tax) : 0,
    })),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== "string") return res.status(400).json({ message: "Invalid id" });

  try {
    if (req.method === "GET") {
      const quotation = await prisma.quotation.findUnique({
        where: { id },
        include: { client: true, items: true },
      });
      if (!quotation) return res.status(404).json({ message: "Not found" });
      return res.status(200).json(serializeQuotation(quotation));
    }

    if (req.method === "PUT") {
      const { status } = req.body;
      if (!status) return res.status(400).json({ message: "Status is required" });

      const updated = await prisma.quotation.update({
        where: { id },
        data: { status },
        include: { client: true, items: true },
      });
      return res.status(200).json(serializeQuotation(updated));
    }

    if (req.method === "DELETE") {
      await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
      await prisma.quotation.delete({ where: { id } });
      return res.status(200).json({ message: "Deleted" });
    }

    return res.status(405).end();
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
}