import { prisma } from "@/lib/prisma";
import { receivePurchaseStock } from "../../../lib/inventory";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const { page = 1, limit = 20, status, supplierId } = req.query;
      const where: any = {};
      if (status) where.status = String(status);
      if (supplierId) where.supplierId = String(supplierId);

      const [purchases, total] = await prisma.$transaction([
        prisma.purchase.findMany({
          where,
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          orderBy: { createdAt: "desc" },
          include: {
            supplier: { select: { id: true, name: true } },
            items: { include: { product: { select: { id: true, name: true, sku: true } } } },
          },
        }),
        prisma.purchase.count({ where }),
      ]);

      return res.status(200).json({ purchases, total });
    }

    if (req.method === "POST") {
      const { supplierId, items, tax, deliveryFee, status, notes, referenceNo } = req.body;

      if (!supplierId || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "supplierId and items are required" });
      }

      const subTotal = items.reduce((sum: number, i: any) => sum + Number(i.costPrice) * Number(i.quantity), 0);
      const taxAmount = Number(tax) || 0;
      const deliveryFeeAmount = Number(deliveryFee) || 0;
      const total = subTotal + taxAmount + deliveryFeeAmount;

      const purchase = await prisma.purchase.create({
        data: {
          supplierId,
          subTotal,
          tax: taxAmount,
          deliveryFee: deliveryFeeAmount,
          total,
          status: status || "PENDING",
          notes,
          referenceNo,
          items: {
            create: items.map((i: any) => ({
              productId: i.productId,
              name: i.name,
              quantity: Number(i.quantity),
              costPrice: Number(i.costPrice),
              tax: Number(i.tax) || 0,
              total: Number(i.costPrice) * Number(i.quantity),
            })),
          },
        },
        include: { items: true, supplier: true },
      });

      // If already RECEIVED, update inventory immediately
      if (purchase.status === "RECEIVED") {
        await receivePurchaseStock(purchase.id);
      }

      return res.status(201).json(purchase);
    }

    return res.status(405).end();
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}


