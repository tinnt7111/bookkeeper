import { createPrismaClient } from "../src/lib/db";
import { addDays } from "date-fns";
import { nanoid } from "nanoid";
import { buildDedupeHash } from "../src/lib/import/normalize";
import { applyRules } from "../src/lib/rules/apply-rules";
import { ensureBankProfilesForUser } from "../src/lib/banks/ensure-profiles";
import { profileIdForUser, accountIdForUser } from "../src/lib/banks/presets";

const db = createPrismaClient();

type MockTxn = {
  date: string;
  description: string;
  amount: string;
  direction: "credit" | "debit";
};

const mockTransactions: MockTxn[] = [
  { date: "01/05/2026", description: "EBAY INC PAYMENT", amount: "245.00", direction: "credit" },
  { date: "01/08/2026", description: "EBAY SELLING FEES", amount: "32.50", direction: "debit" },
  { date: "01/12/2026", description: "WHOLE FOODS MARKET", amount: "86.14", direction: "debit" },
  { date: "01/18/2026", description: "PAYPAL TRANSFER EBAY SALE", amount: "512.00", direction: "credit" },
  { date: "01/22/2026", description: "USPS SHIPPING SUPPLIES", amount: "48.20", direction: "debit" },
  { date: "02/03/2026", description: "EBAY INC PAYMENT", amount: "318.75", direction: "credit" },
  { date: "02/09/2026", description: "NETFLIX.COM", amount: "15.99", direction: "debit" },
  { date: "02/14/2026", description: "PAYPAL TRANSFER EBAY SALE", amount: "189.00", direction: "credit" },
  { date: "02/20/2026", description: "AMAZON MKTPLACE PMTS", amount: "67.40", direction: "debit" },
  { date: "02/27/2026", description: "EBAY SELLING FEES", amount: "41.10", direction: "debit" },
  { date: "03/04/2026", description: "EBAY INC PAYMENT", amount: "402.30", direction: "credit" },
  { date: "03/11/2026", description: "SHELL OIL", amount: "54.22", direction: "debit" },
  { date: "03/15/2026", description: "PAYPAL TRANSFER EBAY SALE", amount: "275.50", direction: "credit" },
  { date: "03/22/2026", description: "STAPLES STORE SUPPLIES", amount: "29.99", direction: "debit" },
  { date: "03/28/2026", description: "UNKNOWN MERCHANT XYZ", amount: "12.00", direction: "debit" },
];

async function seedUser(email: string, name: string) {
  const user = await db.user.upsert({
    where: { email },
    update: { name },
    create: {
      email,
      name,
      emailVerified: new Date(),
    },
  });

  await ensureBankProfilesForUser(user.id);

  const chaseProfileId = profileIdForUser(user.id, "chase-checking");
  const chaseAccountId = accountIdForUser(user.id, "chase-checking");

  await db.classificationRule.deleteMany({ where: { userId: user.id } });
  await db.classificationRule.createMany({
    data: [
      {
        userId: user.id,
        name: "eBay revenue",
        pattern: "ebay",
        field: "description",
        matchType: "contains",
        classification: "business",
        priority: 10,
      },
      {
        userId: user.id,
        name: "PayPal eBay sales",
        pattern: "paypal",
        field: "description",
        matchType: "contains",
        classification: "business",
        priority: 9,
      },
      {
        userId: user.id,
        name: "Shipping supplies",
        pattern: "usps",
        field: "description",
        matchType: "contains",
        classification: "business",
        priority: 5,
      },
      {
        userId: user.id,
        name: "Personal streaming",
        pattern: "netflix",
        field: "description",
        matchType: "contains",
        classification: "personal",
        priority: 5,
      },
    ],
  });

  const rules = await db.classificationRule.findMany({
    where: { userId: user.id },
  });

  await db.transaction.deleteMany({ where: { userId: user.id } });
  await db.importBatch.deleteMany({ where: { userId: user.id } });

  const importBatch = await db.importBatch.create({
    data: {
      userId: user.id,
      bankAccountId: chaseAccountId,
      bankProfileId: chaseProfileId,
      filename: "chase-statement-jan-mar-2026.csv",
      rowCount: mockTransactions.length,
      skippedCount: 0,
      dateFrom: new Date("2026-01-05T00:00:00.000Z"),
      dateTo: new Date("2026-03-28T00:00:00.000Z"),
    },
  });

  for (const txn of mockTransactions) {
    const [month, day, year] = txn.date.split("/").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const { classification, categoryId } = applyRules(
      {
        description: txn.description,
        amount: txn.amount,
        direction: txn.direction,
      },
      rules
    );

    const dedupeHash = buildDedupeHash({
      date,
      amount: txn.amount,
      direction: txn.direction,
      description: txn.description,
      bankAccountId: chaseAccountId,
    });

    await db.transaction.create({
      data: {
        userId: user.id,
        bankAccountId: chaseAccountId,
        importBatchId: importBatch.id,
        date,
        amount: txn.amount,
        direction: txn.direction,
        description: txn.description,
        rawDescription: txn.description,
        classification,
        categoryId,
        dedupeHash,
      },
    });
  }

  await db.invite.deleteMany({ where: { createdByUserId: user.id } });
  await db.invite.create({
    data: {
      token: nanoid(24),
      email: "family@local.dev",
      createdByUserId: user.id,
      expiresAt: addDays(new Date(), 30),
    },
  });

  return user;
}

async function main() {
  const demoUser = await seedUser("demo@local.dev", "Demo User");
  await seedUser("family@local.dev", "Family Member");

  console.log("Seed complete.");
  console.log(`Demo login: demo@local.dev (user id: ${demoUser.id})`);
  console.log("Family login: family@local.dev");
  console.log("Bank profiles: Chase, Capital One, Bank of America");
  console.log("Run: npm run dev → open http://localhost:3000/login");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
