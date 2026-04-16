-- AddColumn: section and sortOrder to QuotationItem
ALTER TABLE "QuotationItem" ADD COLUMN "section" TEXT NOT NULL DEFAULT 'General';
ALTER TABLE "QuotationItem" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AddColumn: deposit to Invoice
ALTER TABLE "Invoice" ADD COLUMN "deposit" REAL NOT NULL DEFAULT 0;

-- CreateTable: InvoiceInstallment
CREATE TABLE "InvoiceInstallment" (
    "id"        TEXT     NOT NULL PRIMARY KEY,
    "invoiceId" TEXT     NOT NULL,
    "amount"    REAL     NOT NULL,
    "dueDate"   DATETIME NOT NULL,
    "paidAt"    DATETIME,
    "status"    TEXT     NOT NULL DEFAULT 'PENDING',
    "notes"     TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceInstallment_invoiceId_fkey"
        FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);
