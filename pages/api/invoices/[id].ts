import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { serializeInvoice } from "../../../lib/serializer";

export default async function handler(req: any, res: any) {
  const { id } = req.query;
  try {
    if (req.method === "GET") {
      const invoice = await prisma.invoice.findUnique({
        where: { id: String(id) },
        include: { client: true, items: true, installments: { orderBy: { dueDate: "asc" } } },
      });
      if (!invoice) return res.status(404).json({ message: "Not found" });
      return res.status(200).json({
        ...serializeInvoice(invoice),
        installments: invoice.installments,
        deposit: Number(invoice.deposit),
        depositMethod: (invoice as any).depositMethod || "",
        materialCost: Number((invoice as any).materialCost) || 0,
        linkedPurchaseIds: ((invoice as any).linkedPurchaseIds || "").split(",").filter(Boolean),
      });
    }

    // Full update from edit page (PUT)
    if (req.method === "PUT") {
      const { items, deposit, depositMethod, installments, status, dueDate, linkedPurchaseIds } = req.body;

      if (!Array.isArray(items) || items.length === 0)
        return res.status(400).json({ message: "Items are required" });

      const subTotal = items.reduce((s: number, i: any) => s + Number(i.price) * Number(i.quantity), 0);
      const tax = items.reduce(
        (s: number, i: any) => s + Number(i.price) * Number(i.quantity) * ((Number(i.tax) || 0) / 100), 0
      );
      const total = subTotal + tax;

      // Recalculate material cost
      const itemMaterialCost = items.reduce(
        (s: number, i: any) => s + Number(i.costPrice || 0) * Number(i.quantity), 0
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

      // Delete old items & installments, recreate
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: String(id) } });
      await prisma.invoiceInstallment.deleteMany({ where: { invoiceId: String(id) } });

      const invoice = await prisma.invoice.update({
        where: { id: String(id) },
        data: {
          subTotal: new Prisma.Decimal(subTotal),
          tax: new Prisma.Decimal(tax),
          total: new Prisma.Decimal(total),
          deposit: Number(deposit) || 0,
          depositMethod: depositMethod || "",
          status: status || "UNPAID",
          dueDate: dueDate ? new Date(dueDate) : null,
          materialCost,
          linkedPurchaseIds: purchaseIds.join(","),
          items: {
            create: items.map((i: any) => ({
              name: i.name,
              quantity: Number(i.quantity),
              price: Number(i.price),
              costPrice: Number(i.costPrice || 0),
              tax: Number(i.tax) || 0,
            })),
          },
          ...(Array.isArray(installments) && installments.length > 0
            ? {
                installments: {
                  create: installments.map((inst: any) => ({
                    amount: Number(inst.amount),
                    dueDate: new Date(inst.dueDate),
                    notes: inst.notes || "",
                    status: inst.status || "PENDING",
                    paymentMethod: inst.paymentMethod || "",
                  })),
                },
              }
            : {}),
        },
        include: { client: true, items: true, installments: { orderBy: { dueDate: "asc" } } },
      });

      return res.status(200).json({
        ...serializeInvoice(invoice),
        installments: invoice.installments,
        deposit: Number(invoice.deposit),
        depositMethod: (invoice as any).depositMethod || "",
      });
    }

    if (req.method === "PATCH") {
      const { status } = req.body;
      const invoice = await prisma.invoice.update({
        where: { id: String(id) },
        data: { status },
        include: { client: true, items: true, installments: { orderBy: { dueDate: "asc" } } },
      });
      return res.status(200).json({
        ...serializeInvoice(invoice),
        installments: invoice.installments,
        deposit: Number(invoice.deposit),
      });
    }

    if (req.method === "DELETE") {
      await prisma.invoice.delete({ where: { id: String(id) } });
      return res.status(204).end();
    }

    return res.status(405).end();
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}
