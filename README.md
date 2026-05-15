# Daily Reminder

AI-powered daily reminder system. Captures your notes via a web UI, then every workday at 7AM WIB summarizes yesterday's notes into a prioritized to-do list delivered via Telegram.

Built with Next.js 15 (App Router), Vercel Postgres, Drizzle ORM, and Deepseek V4 Flash.

## Features

- **Notes Input** — Freeform text area with autosave and yesterday's notes for reference
- **AI Summarization** — Categorizes notes into urgent/important follow-ups vs. prepare-ahead items
- **Telegram Delivery** — Formatted to-do list arrives at 7AM WIB every workday (Mon–Fri)
- **No Auth** — Single-user, no signup required

## Quick Start

```bash
# install
npm install

# set env vars
cp .env.local.example .env.local
# fill in: DATABASE_URL, DEEPSEEK_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, CRON_SECRET

# migrate database
npx drizzle-kit migrate

# run dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to take notes.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Vercel Postgres / Neon connection string |
| `DEEPSEEK_API_KEY` | Yes | Deepseek API key (V4 Flash) |
| `DEEPSEEK_BASE_URL` | No | Defaults to `https://api.deepseek.com/v1` |
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from [@BotFather](https://t.me/botfather) |
| `TELEGRAM_CHAT_ID` | Yes | Your Telegram chat ID |
| `CRON_SECRET` | Yes | Random secret to secure the cron endpoint (`openssl rand -hex 32`) |

## Deploy to Vercel

1. Push to GitHub
2. Import repo at [vercel.com/new](https://vercel.com/new)
3. Add all env vars in Project Settings → Environment Variables
4. Attach Vercel Postgres (or Neon) via Storage tab
5. Run migration: `npx drizzle-kit migrate`
6. Cron fires automatically at `0 0 * * 1-5` UTC (7AM WIB)

## Test Locally

```bash
# trigger cron manually
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron?force=true

# run tests
npx vitest run --config vitest.config.ts
```

## Tech Stack

- [Next.js 15](https://nextjs.org/) — App Router, Route Handlers, Server Components
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) / [Neon](https://neon.tech) — Serverless Postgres
- [Drizzle ORM](https://orm.drizzle.team/) — Type-safe database queries & migrations
- [Deepseek V4 Flash](https://platform.deepseek.com/) — AI summarization via OpenAI-compatible SDK
- [Telegram Bot API](https://core.telegram.org/bots/api) — Message delivery

## Project Structure

```
├── app/
│   ├── api/notes/route.ts       # Notes CRUD API
│   ├── api/cron/route.ts        # Cron orchestrator
│   ├── page.tsx                 # Notes input UI
│   └── globals.css              # Styles
├── db/
│   ├── schema.ts                # Database tables
│   ├── index.ts                 # Drizzle client
│   └── migrate.ts               # Migration runner
├── lib/
│   ├── wib-date.ts              # WIB timezone helpers
│   ├── telegram.ts              # Telegram Bot API
│   └── summarize.ts             # Deepseek integration
├── drizzle/                     # SQL migrations
└── vercel.json                  # Cron schedule
```
