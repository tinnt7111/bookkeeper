"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";

export async function createCard(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "Card name is required." };
  }

  if (name.length > 64) {
    return { error: "Card name must be 64 characters or fewer." };
  }

  const existing = await db.card.findFirst({
    where: {
      userId: user.id,
      name: { equals: name, mode: "insensitive" },
    },
  });

  if (existing) {
    return { error: `Card “${existing.name}” already exists.` };
  }

  const card = await db.card.create({
    data: {
      userId: user.id,
      name,
    },
  });

  revalidatePath("/import");
  revalidatePath("/transactions");

  return { card: { id: card.id, name: card.name } };
}

export async function deleteCard(cardId: string) {
  const user = await requireUser();

  const card = await db.card.findFirst({
    where: { id: cardId, userId: user.id },
  });

  if (!card) {
    return { error: "Card not found." };
  }

  // Transactions keep cardLabel for display; cardId is set null via FK.
  await db.card.delete({ where: { id: card.id } });

  revalidatePath("/import");
  revalidatePath("/transactions");

  return { deleted: true };
}
