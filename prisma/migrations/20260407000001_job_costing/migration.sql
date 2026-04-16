-- Add costPrice to InvoiceItem (internal only, never shown in PDF)
ALTER TABLE "InvoiceItem" ADD COLUMN "costPrice" REAL NOT NULL DEFAULT 0;

-- Add job costing fields to Invoice
ALTER TABLE "Invoice" ADD COLUMN "materialCost" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "linkedPurchaseIds" TEXT NOT NULL DEFAULT '';
