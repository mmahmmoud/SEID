-- Add WooCommerce integration fields to Invoice table
ALTER TABLE "Invoice" ADD COLUMN "woocommerceOrderId" TEXT;

-- Unique index so we never duplicate an order
CREATE UNIQUE INDEX "Invoice_woocommerceOrderId_key"
  ON "Invoice"("woocommerceOrderId")
  WHERE "woocommerceOrderId" IS NOT NULL;

-- Index for fast lookups by WC order ID
CREATE INDEX "Invoice_woocommerceOrderId_idx"
  ON "Invoice"("woocommerceOrderId");

-- Track where the bank transaction came from (woocommerce, import, manual)
-- The "source" column already exists in BankTransaction — no change needed.
