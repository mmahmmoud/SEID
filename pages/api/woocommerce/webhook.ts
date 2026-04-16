import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const config = { api: { bodyParser: false } };

// ─── Read raw body for HMAC verification ─────────────────────────────────────
async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// ─── Verify WooCommerce webhook signature ─────────────────────────────────────
function verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const digest = hmac.digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ─── Map WooCommerce order status to ERP invoice status ──────────────────────
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

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await getRawBody(req);
  const signature = req.headers["x-wc-webhook-signature"] as string;
  const webhookSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET ?? "";

  // Verify signature (skip in development if secret not set)
  if (webhookSecret && signature) {
    if (!verifySignature(rawBody, signature, webhookSecret)) {
      console.error("[WC Webhook] Invalid signature");
      return res.status(401).json({ message: "Invalid signature" });
    }
  }

  let order: any;
  try {
    order = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ message: "Invalid JSON" });
  }

  const topic = req.headers["x-wc-webhook-topic"] as string;
  console.log(`[WC Webhook] Topic: ${topic} | Order #${order.number} | Status: ${order.status}`);

  // Only handle order events
  if (!topic?.startsWith("order.")) {
    return res.status(200).json({ message: "Topic ignored" });
  }

  try {
    await syncOrderToERP(order);
    return res.status(200).json({ message: "Synced", orderId: order.id });
  } catch (err: any) {
    console.error("[WC Webhook] Error:", err.message);
    return res.status(500).json({ message: err.message });
  }
}

// ─── Core sync logic ──────────────────────────────────────────────────────────
async function syncOrderToERP(order: any) {
  // 1. Find or create client by billing email
  const clientId = await findOrCreateClient(order);

  // 2. Build line items with cost price from Product table
  const items = await buildLineItems(order.line_items ?? []);

  // 3. Calculate totals (use WooCommerce values directly)
  const subTotal = parseFloat(order.subtotal ?? "0");
  const taxTotal = parseFloat(order.total_tax ?? "0");
  const total = parseFloat(order.total ?? "0");

  // 4. Calculate material cost from product cost prices
  const materialCost = items.reduce(
    (sum, i) => sum + i.costPrice * i.quantity,
    0
  );

  const erpStatus = mapStatus(order.status);
  const wcOrderRef = `WC-${order.number}`;

  // 5. Check if invoice already exists for this WooCommerce order
  const existing = await (prisma as any).invoice.findFirst({
    where: { woocommerceOrderId: String(order.id) },
  });

  if (existing) {
    // Update existing invoice (e.g. status change from processing → completed)
    await (prisma as any).invoice.update({
      where: { id: existing.id },
      data: {
        status: erpStatus,
        subTotal: new Prisma.Decimal(subTotal),
        tax: new Prisma.Decimal(taxTotal),
        total: new Prisma.Decimal(total),
        materialCost,
        updatedAt: new Date(),
      },
    });

    // If paid, record bank transaction
    if (erpStatus === "PAID") {
      await recordPayment(existing.id, order, total);
    }

    console.log(`[WC Webhook] Updated invoice ${existing.id} for order #${order.number}`);
    return existing.id;
  }

  // 6. Create new invoice
  const invoice = await (prisma as any).invoice.create({
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
    include: { client: true, items: true },
  });

  // Deduct inventory for each line item
  await deductInventory(invoice.id, items);

  // If order is already paid on arrival, record bank transaction
  if (erpStatus === "PAID") {
    await recordPayment(invoice.id, order, total);
  }

  console.log(`[WC Webhook] Created invoice ${invoice.id} for order #${order.number} (${wcOrderRef})`);
  return invoice.id;
}

// ─── Find or create client from WooCommerce billing info ─────────────────────
async function findOrCreateClient(order: any): Promise<string> {
  const billing = order.billing ?? {};
  const email = billing.email?.toLowerCase().trim() ?? "";
  const name = [billing.first_name, billing.last_name].filter(Boolean).join(" ").trim()
    || billing.company
    || email
    || "WooCommerce Customer";

  const phone = billing.phone ?? "";
  const address = [
    billing.address_1,
    billing.address_2,
    billing.city,
    billing.state,
    billing.country,
  ]
    .filter(Boolean)
    .join(", ");

  // Try to find by email first
  if (email) {
    const existing = await prisma.client.findFirst({
      where: { email: { equals: email } },
    });
    if (existing) return existing.id;
  }

  // Create new client
  const client = await prisma.client.create({
    data: { name, email: email || null, phone: phone || null, address: address || null },
  });

  console.log(`[WC Webhook] Created new client: ${client.name} (${client.id})`);
  return client.id;
}

// ─── Build line items, matching SKU to Product for costPrice ─────────────────
async function buildLineItems(lineItems: any[]) {
  const results = [];

  for (const item of lineItems) {
    const sku = item.sku?.trim() ?? "";
    const unitPrice = parseFloat(item.price ?? "0");
    const quantity = parseInt(item.quantity ?? "1", 10);
    const taxTotal = parseFloat(item.total_tax ?? "0");
    const taxRate = unitPrice > 0 && quantity > 0
      ? (taxTotal / (unitPrice * quantity)) * 100
      : 0;

    let costPrice = 0;
    let productId: string | null = null;

    // Look up product by SKU to get cost price
    if (sku) {
      const product = await prisma.product.findUnique({ where: { sku } });
      if (product) {
        costPrice = product.costPrice;
        productId = product.id;
      }
    }

    results.push({
      name: item.name ?? "Product",
      quantity,
      price: unitPrice,
      costPrice,
      tax: Math.round(taxRate * 100) / 100,
      productId,
      wcItemId: item.id,
    });
  }

  return results;
}

// ─── Deduct inventory for sold items ─────────────────────────────────────────
async function deductInventory(invoiceId: string, items: any[]) {
  for (const item of items) {
    if (!item.productId) continue;

    try {
      await prisma.$transaction([
        prisma.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        }),
        prisma.inventoryLog.create({
          data: {
            productId: item.productId,
            type: "OUT",
            quantity: item.quantity,
            costPrice: item.costPrice,
            reference: `WooCommerce sale`,
            notes: `Auto-deducted from online order`,
            invoiceId,
            referenceType: "PROJECT",
          },
        }),
      ]);
    } catch (err: any) {
      console.error(`[WC Webhook] Inventory deduct failed for ${item.productId}:`, err.message);
    }
  }
}

// ─── Record payment as bank transaction ──────────────────────────────────────
async function recordPayment(invoiceId: string, order: any, amount: number) {
  // Find the first active bank account to credit (you can refine this later)
  const bankAccount = await prisma.bankAccount.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (!bankAccount) {
    console.warn("[WC Webhook] No active bank account found, skipping payment record");
    return;
  }

  const paymentMethod = order.payment_method_title ?? order.payment_method ?? "WooCommerce";
  const description = `WooCommerce Order #${order.number} — ${paymentMethod}`;

  // Avoid duplicate bank transaction
  const existingTx = await prisma.bankTransaction.findFirst({
    where: { reference: `WC-${order.id}`, bankAccountId: bankAccount.id },
  });
  if (existingTx) return;

  await prisma.$transaction([
    prisma.bankTransaction.create({
      data: {
        bankAccountId: bankAccount.id,
        date: new Date(order.date_paid ?? order.date_created ?? Date.now()),
        description,
        amount,
        type: "credit",
        reference: `WC-${order.id}`,
        status: "unmatched",
        source: "woocommerce",
        remainingAmount: amount,
      },
    }),
    prisma.bankAccount.update({
      where: { id: bankAccount.id },
      data: { currentBalance: { increment: amount } },
    }),
  ]);

  console.log(`[WC Webhook] Recorded payment of ${amount} for order #${order.number}`);
}
