import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";
import { serializeInvoice, serializeInvoices } from "../../lib/serializer";

export default async function handler(req: any, res: any) {
  try {
    if (req.method === "GET") {
      const { page = 1, limit = 20, search } = req.query;

      const invoices = await prisma.invoice.findMany({
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { id: true, name: true } },
          items: true,
          installments: { orderBy: { dueDate: "asc" } },
        },
        where: search
          ? { client: { name: { contains: String(search) } } }
          : undefined,
      });

      return res.status(200).json(
        invoices.map((inv) => ({
          ...serializeInvoice(inv),
          installments: inv.installments,
          deposit: Number(inv.deposit),
        }))
      );
    }

    if (req.method === "POST") {
      const { clientId, dueDate, items, deposit, installments, linkedPurchaseIds } = req.body;

      if (!clientId || !Array.isArray(items) || items.length === 0)
        return res.status(400).json({ message: "Missing required fields" });

      const subTotal = items.reduce(
        (sum: number, i: any) => sum + Number(i.unitPrice || 0) * Number(i.quantity || 0), 0
      );
      const tax = items.reduce(
        (sum: number, i: any) =>
          sum + (Number(i.tax || 0) / 100) * Number(i.unitPrice || 0) * Number(i.quantity || 0), 0
      );
      const total = subTotal + tax;

      // materialCost = sum of per-item costs + any PO-linked cost
      const itemMaterialCost = items.reduce(
        (sum: number, i: any) => sum + Number(i.costPrice || 0) * Number(i.quantity || 0), 0
      );
      const purchaseIds = Array.isArray(linkedPurchaseIds) ? linkedPurchaseIds : [];
      let poCost = 0;
      if (purchaseIds.length > 0) {
        const purchases = await (prisma as any).purchase.findMany({
          where: { id: { in: purchaseIds } },
          select: { total: true },
        });
        poCost = purchases.reduce((s: number, p: any) => s + Number(p.total), 0);
      }
      const materialCost = itemMaterialCost + poCost;

      const invoice = await prisma.invoice.create({
        data: {
          clientId,
          dueDate: dueDate ? new Date(dueDate) : null,
          subTotal: new Prisma.Decimal(subTotal),
          tax: new Prisma.Decimal(tax),
          total: new Prisma.Decimal(total),
          deposit: Number(deposit) || 0,
          status: "UNPAID",
          materialCost,
          linkedPurchaseIds: purchaseIds.join(","),
          items: {
            create: items.map((i: any) => ({
              name: i.description || i.name || "Item",
              quantity: Number(i.quantity),
              price: Number(i.unitPrice || 0),
              costPrice: Number(i.costPrice || 0),
              tax: Number(i.tax || 0),
            })),
          },
          installments: Array.isArray(installments) && installments.length > 0
            ? {
                create: installments.map((inst: any) => ({
                  amount: Number(inst.amount),
                  dueDate: new Date(inst.dueDate),
                  notes: inst.notes || "",
                  status: "PENDING",
                })),
              }
            : undefined,
        },
        include: {
          client: true,
          items: true,
          installments: { orderBy: { dueDate: "asc" } },
        },
      });

      return res.status(201).json({
        ...serializeInvoice(invoice),
        installments: invoice.installments,
        deposit: Number(invoice.deposit),
      });
    }

    return res.status(405).end();
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}


