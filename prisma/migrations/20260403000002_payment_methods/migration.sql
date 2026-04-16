-- Add depositMethod to Invoice
ALTER TABLE "Invoice" ADD COLUMN "depositMethod" TEXT NOT NULL DEFAULT '';

-- Add paymentMethod to InvoiceInstallment
ALTER TABLE "InvoiceInstallment" ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT '';
