import type { NextApiRequest, NextApiResponse } from "next";
import { getOrders } from "@/lib/woocommerce";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * POST /api/woocommerce/sync
 *
 * Manually pulls recent WooCommerce orders and creates/updates invoices.
 * Useful for:
 *  - Initial setup (backfill past orders)
 *  - Recovery if webhooks missed events
 *
 * Body params:
 *  - after: ISO date string — only sync orders after this date (default: 30 days ago)
 *  - status: WC order status filter (default: "any")
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { after, status = "any" } = req.body ?? {};

  const afterDate = after
    ? new Date(after).toISOString()
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    let page = 1;
    let totalSynced = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    while (true) {
      const orders = await getOrders({ status, after: afterDate, per_page: 50, page });
      if (orders.length === 0) break;

      for (const order of orders) {
        try {
          const exists = await (prisma as any).invoice.findFirst({
            where: { woocommerceOrderId: String(order.id) },
          });

          if (exists) {
            totalSkipped++;
            continue;
          }

          // Find or create client
          const clientId = await findOrCreateClient(order);

          // Build items with cost prices
          const items = await buildLineItems(order.line_items ?? []);

          const subTotal = parseFloat(order.subtotal ?? "0");
          const taxTotal = parseFloat(order.total_tax ?? "0");
          const total = parseFloat(order.total ?? "0");
          const materialCost = items.reduce((s, i) => s + i.costPrice * i.quantity, 0);
          const erpStatus = mapStatus(order.status);

          await (prisma as any).invoice.create({
            data: {
              clientId,
              woocommerceOrderId: String(order.id),
              subTotal: new Prisma.Decimal(subTotal),
              tax: new Prisma.Decimal(taxTotal),
              total: new Prisma.Decimal(total),
              deposit: 0,
              depositMethod: "",
              status: erpStatus,
              materialCost,
              linkedPurchaseIds: "",
              dueDate: null,
              createdAt: new Date(order.date_created),
              items: {
                create: items.map((i) => ({
                  name: i.name,
                  quantity: i.quantity,
                  price: i.price,
                  costPrice: i.costPrice,
                  tax: i.tax,
                  productId: i.productId ?? null,
                })),
              },
            },
          });

          totalSynced++;
        } catch (err: any) {
          errors.push(`Order #${order.number}: ${err.message}`);
        }
      }

      if (orders.length < 50) break;
      page++;
    }

    return res.status(200).json({
      synced: totalSynced,
      skipped: totalSkipped,
      errors,
      message: `Synced ${totalSynced} orders, skipped ${totalSkipped} existing`,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
}

function mapStatus(wcStatus: string): string {
  const map: Record<string, string> = {
    pending: "UNPAID",
    processing: "UNPAID",
    "on-hold": "UNPAID",
    completed: "PAID",
    cancelled: "CANCELLED",
    refunded: "CANCELLED",
    failed: "CANCELLED",
  };
  return map[wcStatus] ?? "UNPAID";
}

async function findOrCreateClient(order: any): Promise<string> {
  const billing = order.billing ?? {};
  const email = billing.email?.toLowerCase().trim() ?? "";
  const name = [billing.first_name, billing.last_name].filter(Boolean).join(" ").trim()
    || billing.company || email || "WooCommerce Customer";
  const phone = billing.phone ?? "";
  const address = [billing.address_1, billing.address_2, billing.city, billing.state, billing.country]
    .filter(Boolean).join(", ");

  if (email) {
    const existing = await prisma.client.findFirst({ where: { email: { equals: email } } });
    if (existing) return existing.id;
  }

  const client = await prisma.client.create({
    data: { name, email: email || null, phone: phone || null, address: address || null },
  });
  return client.id;
}

async function buildLineItems(lineItems: any[]) {
  const results = [];
  for (const item of lineItems) {
    const sku = item.sku?.trim() ?? "";
    const unitPrice = parseFloat(item.price ?? "0");
    const quantity = parseInt(item.quantity ?? "1", 10);
    const taxTotal = parseFloat(item.total_tax ?? "0");
    const taxRate = unitPrice > 0 && quantity > 0 ? (taxTotal / (unitPrice * quantity)) * 100 : 0;

    let costPrice = 0;
    let productId: string | null = null;

    if (sku) {
      const product = await prisma.product.findUnique({ where: { sku } });
      if (product) {
        costPrice = product.costPrice;
        productId = product.id;
      }
    }

    results.push({ name: item.name ?? "Product", quantity, price: unitPrice, costPrice, tax: Math.round(taxRate * 100) / 100, productId });
  }
  return results;
}
