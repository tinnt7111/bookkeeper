# Bookkeeper

Simple hosted bookkeeping app for importing bank CSV statements, classifying business vs personal transactions, and viewing monthly/YTD summaries.

## Local setup

```bash
npm install
cp .env.example .env
npm run setup
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login).

Sign-in uses a configured backdoor username (see `BACKDOOR_USERNAME` in `.env.example`). No password or email verification.

## Mock data

- Seed script: `npm run db:seed`
- Bank profiles: **Chase**, **Capital One**, **Bank of America** — each with **Checking** and **Credit Card** statement types
- Sample CSVs in `mock-data/` (checking + credit card for each bank)

## Pages

- **Dashboard** — YTD business revenue, expenses, net; monthly breakdown by transaction date
- **Transactions** — filter by month/classification; toggle business/personal
- **Import** — upload CSV, preview parsed rows, confirm import
- **Settings** — rules, bank profiles, generate invite links

## Stack

- Next.js (App Router)
- SQLite locally (swap to PostgreSQL for production)
- Prisma
- Auth.js backdoor username login (no password)

## Railway deploy

Set these environment variables on the web service:

| Variable | Example | Notes |
|---|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` | **Required** — missing this causes the Auth.js configuration error |
| `AUTH_URL` | `https://your-app.up.railway.app` | Your public Railway URL |
| `BACKDOOR_USERNAME` | *(your secret username)* | Only this username can sign in without a password |
| `DATABASE_URL` | `file:/data/dev.db` | Use with a mounted volume at `/data` |

Release / start command should run migrations and seed on first deploy:

```bash
npx prisma migrate deploy && npm run db:seed
```

## Useful commands

```bash
npm run dev          # Start dev server
npm run db:seed      # Reload mock data
npm run db:reset     # Reset DB and re-seed
```
