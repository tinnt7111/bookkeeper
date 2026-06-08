-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BankAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bankName" TEXT,
    "statementType" TEXT NOT NULL DEFAULT 'checking',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BankAccount" ("bankName", "createdAt", "currency", "id", "name", "userId") SELECT "bankName", "createdAt", "currency", "id", "name", "userId" FROM "BankAccount";
DROP TABLE "BankAccount";
ALTER TABLE "new_BankAccount" RENAME TO "BankAccount";
CREATE INDEX "BankAccount_userId_idx" ON "BankAccount"("userId");
CREATE TABLE "new_BankProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bankName" TEXT NOT NULL DEFAULT 'Unknown',
    "statementType" TEXT NOT NULL DEFAULT 'checking',
    "dateColumn" TEXT NOT NULL,
    "amountColumn" TEXT NOT NULL,
    "debitColumn" TEXT,
    "creditColumn" TEXT,
    "descriptionColumn" TEXT NOT NULL,
    "dateFormat" TEXT NOT NULL DEFAULT 'MM/dd/yyyy',
    "signRule" TEXT NOT NULL DEFAULT 'negative_debit',
    "skipRows" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BankProfile" ("amountColumn", "createdAt", "creditColumn", "dateColumn", "dateFormat", "debitColumn", "descriptionColumn", "id", "name", "signRule", "skipRows", "userId") SELECT "amountColumn", "createdAt", "creditColumn", "dateColumn", "dateFormat", "debitColumn", "descriptionColumn", "id", "name", "signRule", "skipRows", "userId" FROM "BankProfile";
DROP TABLE "BankProfile";
ALTER TABLE "new_BankProfile" RENAME TO "BankProfile";
CREATE INDEX "BankProfile_userId_idx" ON "BankProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
