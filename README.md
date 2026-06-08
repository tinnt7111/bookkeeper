# Bookkeeper

Simple hosted bookkeeping app for importing bank CSV statements, classifying business vs personal transactions, and viewing monthly/YTD summaries.

## Local setup

```bash
npm install
cp .env.example .env
docker compose up -d
npm run setup
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login).

Sign-in uses a configured backdoor username (see `BACKDOOR_USERNAME` in `.env.example`). No password or email verification.

## Mock data

- Seed script: `npm run db:seed` (local dev only — **wipes all data**)
- Bank profiles: **Chase**, **Capital One**, **Bank of America**, **Wise**, **PayPal**
- Sample CSVs in `mock-data/`

## Pages

- **Dashboard** — YTD business revenue, expenses, net; monthly breakdown by transaction date
- **Transactions** — filter by month/classification; toggle business/personal
- **Import** — upload CSV, preview parsed rows, confirm import
- **Settings** — rules, bank profiles, generate invite links

## Stack

- Next.js (App Router)
- PostgreSQL (local via Docker; Railway Postgres in production)
- Prisma
- Auth.js backdoor username login (no password)

## Railway deploy

**Use PostgreSQL, not SQLite.** SQLite on Railway lives on the container filesystem and is wiped on every deploy. Login still worked before because the app silently recreated your user on an empty database — your imports and rules were already gone.

### 1. Add PostgreSQL

1. Open your **bookkeeper** project in [Railway](https://railway.app)
2. Click **New** → **Database** → **PostgreSQL**
3. Open your **web service** → **Variables** → **Add reference**
4. Link `DATABASE_URL` from the Postgres service (Railway sets this automatically)
5. **Remove** any manual `DATABASE_URL=file:/data/dev.db` — that path is not safe for production

You can delete any `/data` volume on the web service; it is no longer needed.

### 2. Environment variables

Set these on the web service (**Variables** tab). Enter values **without** surrounding quotes:

| Variable | Value |
|---|---|
| `AUTH_SECRET` | your generated secret |
| `AUTH_URL` | `https://your-app.up.railway.app` |
| `BACKDOOR_USERNAME` | your secret username |
| `DATABASE_URL` | *(reference from Postgres service)* |

### 3. Deploy

Push latest code. On start the app:

1. **Refuses to start** if production is still configured with SQLite
2. Runs migrations against Postgres
3. Bootstraps the backdoor user once (idempotent — does not wipe existing data)
4. Starts Next.js

Deploy logs show transaction count on startup so you can confirm data survived:

```
Backdoor user "ron" ready (1 user(s), 842 transaction(s)).
```

### 4. Re-import after switching from SQLite

If you previously used SQLite on Railway, that data is not migrated automatically. Re-import your CSVs once after Postgres is connected.

## Useful commands

```bash
docker compose up -d   # Local Postgres
npm run dev            # Start dev server
npm run db:seed        # Reload mock data (local only)
npm run db:reset       # Reset DB and re-seed
```
