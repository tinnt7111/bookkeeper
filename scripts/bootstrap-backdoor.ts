import "dotenv/config";
import { ensureBackdoorUser } from "../src/lib/auth/ensure-backdoor-user";
import { getBackdoorUsername } from "../src/lib/auth/backdoor";
import { createPrismaClient } from "../src/lib/db";

const db = createPrismaClient();

async function main() {
  const username = getBackdoorUsername();
  if (!username) {
    console.error("BACKDOOR_USERNAME is not set — skipping user bootstrap.");
    return;
  }

  const userCount = await db.user.count();
  const transactionCount = await db.transaction.count();
  await ensureBackdoorUser(username);

  if (userCount === 0) {
    console.log(`Bootstrapped backdoor user "${username}" (first run).`);
  } else {
    console.log(
      `Backdoor user "${username}" ready (${userCount} user(s), ${transactionCount} transaction(s)).`
    );
  }
}

main()
  .catch((error) => {
    console.error("Bootstrap failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
