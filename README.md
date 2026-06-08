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

### 1. Mount a volume (persistent SQLite)

1. Open your **bookkeeper** project in [Railway](https://railway.app)
2. Click your **web service** (the Next.js app)
3. Go to **Settings** → scroll to **Volumes**
4. Click **Add Volume**
5. Set **Mount path** to: `/data`
6. Save — Railway redeploys automatically

Your `DATABASE_URL=file:/data/dev.db` writes the database onto that volume so it survives redeploys.

### 2. Environment variables

Set these on the web service (**Variables** tab). Enter values **without** surrounding quotes:

| Variable | Value |
|---|---|
| `AUTH_SECRET` | your generated secret |
| `AUTH_URL` | `https://bookkeeper-production-bc33.up.railway.app` |
| `BACKDOOR_USERNAME` | `ron` |
| `DATABASE_URL` | `file:/data/dev.db` |

### 3. Deploy

Push latest code. On start the app creates `/data`, runs migrations, then starts Next.js.

First login with your backdoor username auto-creates the user and bank profiles — no manual seed required.

## Useful commands

```bash
npm run dev          # Start dev server
npm run db:seed      # Reload mock data
npm run db:reset     # Reset DB and re-seed
```
