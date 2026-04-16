-- BankAccount
CREATE TABLE "BankAccount" (
  "id"             TEXT    NOT NULL PRIMARY KEY,
  "name"           TEXT    NOT NULL,
  "bankName"       TEXT    NOT NULL,
  "accountNumber"  TEXT    NOT NULL,
  "currency"       TEXT    NOT NULL DEFAULT 'AED',
  "openingBalance" REAL    NOT NULL DEFAULT 0,
  "currentBalance" REAL    NOT NULL DEFAULT 0,
  "isActive"       INTEGER NOT NULL DEFAULT 1,
  "createdAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- BankTransaction
CREATE TABLE "BankTransaction" (
  "id"              TEXT    NOT NULL PRIMARY KEY,
  "bankAccountId"   TEXT    NOT NULL,
  "date"            DATETIME NOT NULL,
  "description"     TEXT    NOT NULL,
  "amount"          REAL    NOT NULL,
  "type"            TEXT    NOT NULL DEFAULT 'credit',
  "reference"       TEXT,
  "status"          TEXT    NOT NULL DEFAULT 'unmatched',
  "source"          TEXT    NOT NULL DEFAULT 'import',
  "remainingAmount" REAL    NOT NULL DEFAULT 0,
  "transferId"      TEXT,
  "createdAt"       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE
);
CREATE INDEX "BankTransaction_bankAccountId_idx" ON "BankTransaction"("bankAccountId");
CREATE INDEX "BankTransaction_date_idx" ON "BankTransaction"("date");
CREATE INDEX "BankTransaction_status_idx" ON "BankTransaction"("status");

-- BankTransfer
CREATE TABLE "BankTransfer" (
  "id"                  TEXT    NOT NULL PRIMARY KEY,
  "type"                TEXT    NOT NULL DEFAULT 'incoming',
  "amount"              REAL    NOT NULL,
  "date"                DATETIME NOT NULL,
  "description"         TEXT    NOT NULL DEFAULT '',
  "fromBankAccountId"   TEXT,
  "toBankAccountId"     TEXT,
  "relatedEntityId"     TEXT,
  "createdAt"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Reconciliation
CREATE TABLE "Reconciliation" (
  "id"                TEXT    NOT NULL PRIMARY KEY,
  "bankTransactionId" TEXT    NOT NULL,
  "entityType"        TEXT    NOT NULL,
  "entityId"          TEXT    NOT NULL,
  "matchedAmount"     REAL    NOT NULL,
  "score"             REAL    NOT NULL DEFAULT 0,
  "createdAt"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE CASCADE
);
CREATE INDEX "Reconciliation_bankTransactionId_idx" ON "Reconciliation"("bankTransactionId");

-- MatchingSuggestion
CREATE TABLE "MatchingSuggestion" (
  "id"                TEXT    NOT NULL PRIMARY KEY,
  "bankTransactionId" TEXT    NOT NULL,
  "entityType"        TEXT    NOT NULL,
  "entityId"          TEXT    NOT NULL,
  "score"             REAL    NOT NULL DEFAULT 0,
  "isSelected"        INTEGER NOT NULL DEFAULT 0,
  "createdAt"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE CASCADE
);
CREATE INDEX "MatchingSuggestion_bankTransactionId_idx" ON "MatchingSuggestion"("bankTransactionId");
