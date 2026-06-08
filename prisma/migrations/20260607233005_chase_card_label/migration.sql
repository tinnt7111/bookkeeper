-- AlterTable
ALTER TABLE "BankProfile" ADD COLUMN "cardColumn" TEXT;
ALTER TABLE "BankProfile" ADD COLUMN "defaultCardLabel" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "cardLabel" TEXT;
