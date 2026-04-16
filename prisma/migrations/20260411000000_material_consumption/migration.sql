-- AlterTable: add new columns to InventoryLog
ALTER TABLE "InventoryLog" ADD COLUMN "consumptionId" TEXT;
ALTER TABLE "InventoryLog" ADD COLUMN "referenceType" TEXT;
ALTER TABLE "InventoryLog" ADD COLUMN "referenceId"   TEXT;
ALTER TABLE "InventoryLog" ADD COLUMN "performedBy"   TEXT;

-- CreateTable: MaterialConsumption
CREATE TABLE "MaterialConsumption" (
    "id"            TEXT NOT NULL PRIMARY KEY,
    "date"          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceType" TEXT NOT NULL,
    "referenceId"   TEXT,
    "notes"         TEXT,
    "createdBy"     TEXT NOT NULL,
    "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     DATETIME NOT NULL
);

-- CreateTable: MaterialConsumptionItem
CREATE TABLE "MaterialConsumptionItem" (
    "id"            TEXT NOT NULL PRIMARY KEY,
    "consumptionId" TEXT NOT NULL,
    "productId"     TEXT NOT NULL,
    "quantity"      REAL NOT NULL,
    "costSnapshot"  REAL NOT NULL,
    CONSTRAINT "MaterialConsumptionItem_consumptionId_fkey"
        FOREIGN KEY ("consumptionId") REFERENCES "MaterialConsumption" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaterialConsumptionItem_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- AddForeignKey: InventoryLog → MaterialConsumption
CREATE INDEX "MaterialConsumptionItem_consumptionId_idx" ON "MaterialConsumptionItem"("consumptionId");
CREATE INDEX "MaterialConsumptionItem_productId_idx"     ON "MaterialConsumptionItem"("productId");
CREATE INDEX "MaterialConsumption_referenceType_idx"     ON "MaterialConsumption"("referenceType");
