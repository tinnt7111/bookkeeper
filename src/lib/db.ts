import path from "node:path";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  if (url.startsWith("file:")) {
    const filePath = url.replace("file:", "");
    if (!path.isAbsolute(filePath)) {
      return `file:${path.join(process.cwd(), filePath)}`;
    }
  }
  return url;
}

function getSchemaFingerprint() {
  const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
  return createHash("sha256").update(readFileSync(schemaPath)).digest("hex");
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaFingerprint?: string;
};

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: getDatabaseUrl(),
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const schemaFingerprint = getSchemaFingerprint();

if (
  process.env.NODE_ENV !== "production" &&
  globalForPrisma.prisma &&
  globalForPrisma.prismaSchemaFingerprint !== schemaFingerprint
) {
  globalForPrisma.prisma = undefined;
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaSchemaFingerprint = schemaFingerprint;
}

export { createPrismaClient };
