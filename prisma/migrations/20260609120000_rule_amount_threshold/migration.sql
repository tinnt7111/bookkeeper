-- AlterTable
ALTER TABLE "ClassificationRule" ADD COLUMN "amountOperator" TEXT NOT NULL DEFAULT 'gt';
ALTER TABLE "ClassificationRule" ADD COLUMN "amountValue" TEXT NOT NULL DEFAULT '0';
