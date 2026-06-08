-- DropIndex
DROP INDEX "Transaction_userId_dedupeHash_key";

-- CreateIndex
CREATE INDEX "Transaction_userId_dedupeHash_idx" ON "Transaction"("userId", "dedupeHash");
