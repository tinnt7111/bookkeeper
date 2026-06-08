const isProduction =
  process.env.NODE_ENV === "production" || Boolean(process.env.RAILWAY_ENVIRONMENT);

if (!isProduction) {
  process.exit(0);
}

const url = process.env.DATABASE_URL ?? "";
const isPostgres = url.startsWith("postgres://") || url.startsWith("postgresql://");

if (isPostgres) {
  console.log("Database: PostgreSQL (persistent)");
  process.exit(0);
}

console.error(`
FATAL: Production requires PostgreSQL.

SQLite on Railway is stored on the container filesystem and is wiped on every
deploy. Login still works because the app auto-bootstraps a fresh user, which
masks the data loss.

Fix:
  1. In Railway, add a PostgreSQL database to this project
  2. Link it to the web service (Railway sets DATABASE_URL automatically)
  3. Remove any manual DATABASE_URL pointing at file:/data/dev.db
  4. Redeploy — migrations run on start, data persists across deploys

See README.md "Railway deploy" for details.
`);
process.exit(1);
