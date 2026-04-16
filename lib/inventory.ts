/**
 * Inventory & Cost Logic
 * Handles stock movements and average cost calculation.
 */
import { prisma } from "./prisma";

/**
 * Increase stock when a purchase is RECEIVED.
 * Recalculates average cost using weighted average method.
 *
 * New Avg Cost = (Old Stock * Old Cost + New Qty * New Cost) / (Old Stock + New Qty)
 */
export async function receivePurchaseStock(purchaseId: string) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { items: { include: { product: true } } },
  });
  if (!purchase) throw new Error("Purchase not found");

  for (const item of purchase.items) {
    const product = item.product;
    const oldQty = product.stockQuantity;
    const oldCost = product.costPrice;
    const newQty = item.quantity;
    const newCost = item.costPrice;

    // Weighted average cost
    const totalQty = oldQty + newQty;
    const avgCost =
      totalQty > 0
        ? (oldQty * oldCost + newQty * newCost) / totalQty
        : newCost;

    await prisma.$transaction([
      // Update product stock and average cost
      prisma.product.update({
        where: { id: product.id },
        data: {
          stockQuantity: { increment: newQty },
          costPrice: avgCost,
        },
      }),
      // Log the movement
      prisma.inventoryLog.create({
        data: {
          productId: product.id,
          type: "IN",
          quantity: newQty,
          costPrice: newCost,
          reference: purchaseId,
          purchaseId,
          notes: `Purchase received`,
        },
      }),
    ]);
  }
}

/**
 * Decrease stock when an invoice is created.
 * Uses current average cost for COGS calculation.
 */
export async function deductInvoiceStock(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: { include: { product: true } } },
  });
  if (!invoice) throw new Error("Invoice not found");

  for (const item of invoice.items) {
    if (!item.product) continue; // skip items without a linked product

    const product = item.product;
    const deductQty = item.quantity;

    if (product.stockQuantity < deductQty) {
      throw new Error(
        `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}`
      );
    }

    await prisma.$transaction([
      prisma.product.update({
        where: { id: product.id },
        data: { stockQuantity: { decrement: deductQty } },
      }),
      prisma.inventoryLog.create({
        data: {
          productId: product.id,
          type: "OUT",
          quantity: deductQty,
          costPrice: product.costPrice,
          reference: invoiceId,
          invoiceId,
          notes: `Invoice sale`,
        },
      }),
    ]);
  }
}

/**
 * Get products below their low stock threshold.
 */
export async function getLowStockProducts() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
  });
  return products.filter((p) => p.stockQuantity <= p.lowStockAlert);
}

/**
 * Deduct stock when materials are consumed at a project site or workshop.
 * Creates CONSUMPTION inventory log entries for full traceability.
 */
export async function consumeMaterialStock(consumptionId: string) {
  const consumption = await prisma.materialConsumption.findUnique({
    where: { id: consumptionId },
    include: { items: { include: { product: true } } },
  });
  if (!consumption) throw new Error("Material consumption record not found");

  for (const item of consumption.items) {
    const product = item.product;

    if (product.stockQuantity < item.quantity) {
      throw new Error(
        `Insufficient stock for "${product.name}". Available: ${product.stockQuantity} ${(product as any).unit || "pcs"}, requested: ${item.quantity}`
      );
    }

    await prisma.$transaction([
      prisma.product.update({
        where: { id: product.id },
        data: { stockQuantity: { decrement: item.quantity } },
      }),
      prisma.inventoryLog.create({
        data: {
          productId:     product.id,
          type:          "CONSUMPTION",
          quantity:      item.quantity,
          costPrice:     item.costSnapshot,
          reference:     consumptionId,
          consumptionId: consumptionId,
          referenceType: consumption.referenceType,
          referenceId:   consumption.referenceId ?? null,
          performedBy:   consumption.createdBy,
          notes:
            consumption.referenceType === "PROJECT"
              ? `Site consumption – ${consumption.notes || ""}`.trim()
              : `Workshop consumption – ${consumption.notes || ""}`.trim(),
        },
      }),
    ]);
  }
}
