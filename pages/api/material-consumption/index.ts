import { prisma } from "@/lib/prisma";
import { consumeMaterialStock } from "@/lib/inventory";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // ─── GET: List all consumption records ───────────────────────────────────
    if (req.method === "GET") {
      const { referenceType, referenceId, from, to, page = 1, limit = 50 } = req.query;

      const where: any = {};
      if (referenceType) where.referenceType = String(referenceType);
      if (referenceId)   where.referenceId   = String(referenceId);
      if (from || to) {
        where.date = {};
        if (from) where.date.gte = new Date(String(from));
        if (to)   where.date.lte = new Date(String(to));
      }

      const [records, total] = await prisma.$transaction([
        prisma.materialConsumption.findMany({
          where,
          skip:    (Number(page) - 1) * Number(limit),
          take:    Number(limit),
          orderBy: { date: "desc" },
          include: {
            items: {
              include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
            },
          },
        }),
        prisma.materialConsumption.count({ where }),
      ]);

      return res.status(200).json({ records, total });
    }

    // ─── POST: Create a new consumption record ────────────────────────────────
    if (req.method === "POST") {
      const { referenceType, referenceId, notes, createdBy, items, date } = req.body;

      // Validation
      if (!referenceType || !["PROJECT", "WORKSHOP"].includes(referenceType)) {
        return res.status(400).json({ message: "referenceType must be PROJECT or WORKSHOP" });
      }
      if (referenceType === "PROJECT" && !referenceId) {
        return res.status(400).json({ message: "referenceId (client/project) is required for PROJECT type" });
      }
      if (!createdBy) {
        return res.status(400).json({ message: "createdBy is required" });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "At least one item is required" });
      }

      // Fetch current product costs for snapshot + stock check
      const productIds: string[] = items.map((i: any) => String(i.productId));
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      // Pre-validate stock before touching the DB
      for (const item of items) {
        const product = productMap.get(String(item.productId));
        if (!product) {
          return res.status(400).json({ message: `Product not found: ${item.productId}` });
        }
        if (Number(item.quantity) <= 0) {
          return res.status(400).json({ message: `Quantity must be > 0 for product: ${product.name}` });
        }
        if (product.stockQuantity < Number(item.quantity)) {
          return res.status(400).json({
            message: `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}, requested: ${item.quantity}`,
          });
        }
      }

      // Create the record (items + cost snapshots)
      const consumption = await prisma.materialConsumption.create({
        data: {
          date:          date ? new Date(date) : new Date(),
          referenceType,
          referenceId:   referenceType === "PROJECT" ? String(referenceId) : null,
          notes:         notes || null,
          createdBy:     String(createdBy),
          items: {
            create: items.map((i: any) => {
              const product = productMap.get(String(i.productId))!;
              return {
                productId:    String(i.productId),
                quantity:     Number(i.quantity),
                costSnapshot: product.costPrice,
              };
            }),
          },
        },
        include: { items: { include: { product: true } } },
      });

      // Deduct stock and write inventory logs
      await consumeMaterialStock(consumption.id);

      return res.status(201).json(consumption);
    }

    return res.status(405).end();
  } catch (err: any) {
    console.error("[material-consumption]", err);
    return res.status(500).json({ message: err.message });
  }
}
