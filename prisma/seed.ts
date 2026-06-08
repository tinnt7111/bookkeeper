import "dotenv/config";
import { createPrismaClient } from "../src/lib/db";
import { ensureBankProfilesForUser } from "../src/lib/banks/ensure-profiles";
import { getBackdoorUserEmail } from "../src/lib/auth/backdoor";

const db = createPrismaClient();

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
  if (process.env.NODE_ENV === "production" || process.env.RAILWAY_ENVIRONMENT) {
    console.error("db:seed wipes all data. Do not run it in production.");
    process.exit(1);
  }

  const backdoorUsername =
    process.env.BACKDOOR_USERNAME?.trim().toLowerCase() || "ron";

  await wipeDatabase();

  const user = await db.user.create({
    data: {
      email: getBackdoorUserEmail(backdoorUsername),
      name: backdoorUsername,
      emailVerified: new Date(),
    },
  });

  await ensureBankProfilesForUser(user.id);

  console.log("Database cleaned and seeded.");
  console.log("Backdoor user ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
