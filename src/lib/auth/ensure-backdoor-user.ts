import { ensureBankProfilesForUser } from "@/lib/banks/ensure-profiles";
import { db } from "@/lib/db";
import { getBackdoorUserEmail } from "@/lib/auth/backdoor";

export async function ensureBackdoorUser(username: string) {
  const normalized = username.trim().toLowerCase();

  const existing = await db.user.findFirst({
    where: {
      OR: [{ name: normalized }, { email: getBackdoorUserEmail(normalized) }],
    },
  });

  if (existing) {
    if (existing.name !== normalized) {
      return db.user.update({
        where: { id: existing.id },
        data: { name: normalized },
      });
    }
    await ensureBankProfilesForUser(existing.id);
    return existing;
  }

  const user = await db.user.create({
    data: {
      email: getBackdoorUserEmail(normalized),
      name: normalized,
      emailVerified: new Date(),
    },
  });

  await ensureBankProfilesForUser(user.id);
  return user;
}
