import path from "node:path";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? "postgresql://bookkeeper:bookkeeper@localhost:5432/bookkeeper";
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
  const pool = new pg.Pool({ connectionString: getDatabaseUrl() });
  const adapter = new PrismaPg(pool);

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

export function isProductionDeploy() {
  return (
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.RAILWAY_ENVIRONMENT)
  );
}

export function isPostgresDatabaseUrl(url = process.env.DATABASE_URL ?? "") {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}
