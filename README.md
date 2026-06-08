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

### Login

| Username | Notes |
|---|---|
| `ron` | Default user — no password, just enter the username |

Local and production use the same username sign-in (no password).

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
- Auth.js username login (no password; default user `ron`)

## Useful commands

```bash
npm run dev          # Start dev server
npm run db:seed      # Reload mock data
npm run db:reset     # Reset DB and re-seed
```
