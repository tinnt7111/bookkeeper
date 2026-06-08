import { createPrismaClient } from "../src/lib/db";
import { ensureBankProfilesForUser } from "../src/lib/banks/ensure-profiles";

const db = createPrismaClient();

export const DEFAULT_USERNAME = "ron";
const DEFAULT_USER_EMAIL = `${DEFAULT_USERNAME}@local.dev`;

async function wipeDatabase() {
  await db.transaction.deleteMany();
  await db.importBatch.deleteMany();
  await db.classificationRule.deleteMany();
  await db.category.deleteMany();
  await db.bankAccount.deleteMany();
  await db.bankProfile.deleteMany();
  await db.invite.deleteMany();
  await db.session.deleteMany();
  await db.account.deleteMany();
  await db.verificationToken.deleteMany();
  await db.user.deleteMany();
}

async function main() {
  await wipeDatabase();

  const user = await db.user.create({
    data: {
      email: DEFAULT_USER_EMAIL,
      name: DEFAULT_USERNAME,
      emailVerified: new Date(),
    },
  });

  await ensureBankProfilesForUser(user.id);

  console.log("Database cleaned and seeded.");
  console.log(`Login username: ${DEFAULT_USERNAME}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
