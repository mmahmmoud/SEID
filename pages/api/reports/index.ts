import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

function getDateRange(period: string, year?: string, month?: string, quarter?: string) {
  const y = Number(year) || new Date().getFullYear();
  let start: Date, end: Date;

  if (period === "monthly") {
    const m = Number(month) - 1 || new Date().getMonth();
    start = new Date(y, m, 1);
    end = new Date(y, m + 1, 0, 23, 59, 59);
  } else if (period === "quarterly") {
    const q = Number(quarter) || Math.floor(new Date().getMonth() / 3) + 1;
    start = new Date(y, (q - 1) * 3, 1);
    end = new Date(y, q * 3, 0, 23, 59, 59);
  } else {
    // yearly
    start = new Date(y, 0, 1);
    end = new Date(y, 11, 31, 23, 59, 59);
  }

  return { start, end };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const { type, period = "yearly", year, month, quarter } = req.query;
    const { start, end } = getDateRange(
      String(period),
      String(year),
      String(month),
      String(quarter)
    );

    const dateFilter = { gte: start, lte: end };

    // ── Profit Report ───────────────────────────────────────────────────────────
    if (type === "profit") {
      const [invoices, purchases, expenses] = await Promise.all([
        prisma.invoice.findMany({
          where: { createdAt: dateFilter, status: "PAID" },
          select: { total: true, tax: true, materialCost: true },
        }),
        prisma.purchase.findMany({
          where: { createdAt: dateFilter, status: "RECEIVED" },
          select: { total: true, tax: true },
        }),
        (prisma as any).expense.findMany({
          where: { date: dateFilter },
          select: { amount: true },
        }),
      ]);

      const totalSales = invoices.reduce((s, i) => s + Number(i.total), 0);
      const salesTax = invoices.reduce((s, i) => s + Number(i.tax), 0);
      const totalPurchases = purchases.reduce((s, p) => s + Number(p.total), 0);
      const purchasesTax = purchases.reduce((s, p) => s + Number(p.tax), 0);
      const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);

      // Job-level material cost (from invoice cost fields + linked POs)
      const totalMaterialCost = invoices.reduce((s, i) => s + Number((i as any).materialCost || 0), 0);

      const grossProfit = totalSales - totalMaterialCost;
      const netProfit = grossProfit - salesTax - totalExpenses;
      const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

      return res.status(200).json({
        totalSales,
        totalPurchases,
        salesTax,
        purchasesTax,
        totalMaterialCost,
        totalExpenses,
        grossProfit,
        netProfit,
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        period: { start, end },
      });
    }

    // ── VAT Report ──────────────────────────────────────────────────────────────
    if (type === "vat") {
      const [invoices, purchases] = await Promise.all([
        prisma.invoice.findMany({
          where: { createdAt: dateFilter },
          select: { tax: true, total: true },
        }),
        prisma.purchase.findMany({
          where: { createdAt: dateFilter },
          select: { tax: true, total: true },
        }),
      ]);

      const outputVAT = invoices.reduce((s, i) => s + Number(i.tax), 0);
      const inputVAT = purchases.reduce((s, p) => s + Number(p.tax), 0);
      const netVAT = outputVAT - inputVAT;

      return res.status(200).json({
        outputVAT: parseFloat(outputVAT.toFixed(2)),
        inputVAT: parseFloat(inputVAT.toFixed(2)),
        netVAT: parseFloat(netVAT.toFixed(2)),
        vatPayable: netVAT > 0 ? netVAT : 0,
        vatRefund: netVAT < 0 ? Math.abs(netVAT) : 0,
        period: { start, end },
      });
    }

    // ── Inventory Report ────────────────────────────────────────────────────────
    if (type === "inventory") {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        include: {
          inventoryLogs: {
            where: { type: "OUT", createdAt: dateFilter },
          },
        },
      });

      const totalInventoryValue = products.reduce(
        (s, p) => s + p.stockQuantity * p.costPrice,
        0
      );

      const topSelling = [...products]
        .map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          qtySold: p.inventoryLogs.reduce((s, l) => s + l.quantity, 0),
          revenue: p.inventoryLogs.reduce((s, l) => s + l.quantity * p.sellingPrice, 0),
        }))
        .sort((a, b) => b.qtySold - a.qtySold)
        .slice(0, 10);

      const lowStock = products
        .filter((p) => p.stockQuantity <= p.lowStockAlert)
        .map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          stockQuantity: p.stockQuantity,
          lowStockAlert: p.lowStockAlert,
          unit: p.unit,
        }));

      return res.status(200).json({
        totalInventoryValue: parseFloat(totalInventoryValue.toFixed(2)),
        totalProducts: products.length,
        lowStockCount: lowStock.length,
        topSelling,
        lowStock,
        period: { start, end },
      });
    }

    // ── Summary / Dashboard data ────────────────────────────────────────────────
    if (type === "summary") {
      const [invoices, purchases, products, expenses] = await Promise.all([
        prisma.invoice.findMany({ where: { createdAt: dateFilter } }),
        prisma.purchase.findMany({ where: { createdAt: dateFilter } }),
        prisma.product.findMany({ where: { isActive: true } }),
        (prisma as any).expense.findMany({ where: { date: dateFilter }, select: { amount: true } }),
      ]);

      const totalSales = invoices
        .filter((i) => i.status === "PAID")
        .reduce((s, i) => s + Number(i.total), 0);
      const totalMaterialCost = invoices
        .filter((i) => i.status === "PAID")
        .reduce((s, i) => s + Number((i as any).materialCost || 0), 0);
      const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
      const totalPurchases = purchases
        .filter((p) => p.status === "RECEIVED")
        .reduce((s, p) => s + Number(p.total), 0);
      const netProfit = totalSales - totalMaterialCost - totalExpenses;
      const inventoryValue = products.reduce((s, p) => s + p.stockQuantity * p.costPrice, 0);

      return res.status(200).json({
        totalSales,
        totalPurchases,
        totalMaterialCost,
        totalExpenses,
        netProfit,
        inventoryValue,
        period: { start, end },
      });
    }

    return res.status(400).json({ message: "Invalid report type. Use: profit | vat | inventory | summary" });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}


