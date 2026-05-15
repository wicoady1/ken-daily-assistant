---
run: run-ken-daily-assitant-001
work_item: project-scaffold
intent: daily-reminder-system
mode: autopilot
checkpoint: none
approved_at: "2026-05-15T03:17:42Z"
---

# Implementation Plan: Project Scaffold

## Approach

Set up a Next.js App Router project with TypeScript from scratch (manual setup for reliability over create-next-app). Install all system-wide dependencies. Create project configuration files, drizzle config, and .env.local template. This is the foundation for all subsequent work items.

## Files to Create

| File | Purpose |
|------|---------|
| `package.json` | Project manifest with Next.js, drizzle, openai, telegraf, and yaml dependencies |
| `tsconfig.json` | TypeScript config with strict mode and `@/*` path alias |
| `next.config.ts` | Next.js configuration |
| `app/layout.tsx` | Root layout with HTML structure |
| `app/page.tsx` | Placeholder homepage |
| `app/globals.css` | Minimal global styles |
| `drizzle.config.ts` | Drizzle ORM config for Vercel Postgres |
| `.env.local.example` | Template for all required environment variables |

## Files to Modify

| File | Changes |
|------|---------|
| (none) | |

## Tests

| Test File | Coverage |
|-----------|----------|
| (none — scaffold only, no logic to test) | |

## Technical Details

The project follows Next.js App Router conventions. Path alias `@/*` maps to `./*`. All env vars are documented in `.env.local.example`. The `openai` SDK is configured with Deepseek base URL at runtime via env vars, not at build time.

---

## Work Item: database-setup

### Approach

Define the `notes` table Drizzle schema with id (serial), date (unique), content (text), and timestamps. Create the db client using `@vercel/postgres` with drizzle-orm/vercel-postgres adapter. Create a migration runner script. Generate migration via `drizzle-kit generate`.

### Files to Create

| File | Purpose |
|------|---------|
| `db/schema.ts` | Notes table schema definition |
| `db/index.ts` | Typed drizzle client export |
| `db/migrate.ts` | Migration runner script |

### Files to Modify

| File | Changes |
|------|---------|
| (none) | |

### Tests

| Test File | Coverage |
|-----------|----------|
| (none — schema validation via drizzle-kit generate) |

---

## Work Item: telegram-delivery

### Approach

Create `lib/telegram.ts` with a `sendDailyReminder` function that:
1. Reads TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from env vars
2. Formats the to-do list (follow-up today + prepare ahead) as Telegram HTML
3. Sends via Telegram Bot API using `fetch` (no `telegraf` dependency needed)
4. Handles errors: invalid token, rate limits, blocked by user
5. Logs send confirmation

Uses `parse_mode: "HTML"` for simpler formatting compared to MarkdownV2.

### Files to Create

| File | Purpose |
|------|---------|
| `lib/telegram.ts` | Telegram delivery function with HTML formatting and error handling |

### Files to Modify

| File | Changes |
|------|---------|
| (none) | |

### Tests

| Test File | Coverage |
|-----------|----------|
| `lib/telegram.test.ts` | Tests formatting and error handling (unit) | |
