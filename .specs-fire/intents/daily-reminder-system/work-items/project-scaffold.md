---
id: project-scaffold
title: Project Scaffold
intent: daily-reminder-system
complexity: low
mode: autopilot
status: completed
depends_on: []
created: 2026-05-15T10:00:00Z
run_id: run-ken-daily-assitant-001
completed_at: 2026-05-15T03:20:35.790Z
---

# Work Item: Project Scaffold

## Description

Initialize a Next.js App Router project with TypeScript. Install all required dependencies: drizzle-orm, @vercel/postgres, drizzle-kit, openai (for Deepseek compatibility), and telegram bot library. Set up project structure, configuration files, and .env.local template.

## Acceptance Criteria

- [ ] Next.js project bootstrapped with App Router and TypeScript (`npx create-next-app@latest`)
- [ ] Dependencies installed: `drizzle-orm`, `@vercel/postgres`, `drizzle-kit`, `openai`, `telegraf` (or `node-telegram-bot-api`)
- [ ] `drizzle.config.ts` created with Vercel Postgres driver
- [ ] `tsconfig.json` paths and strict mode properly configured
- [ ] `npm run dev` starts the project without errors
- [ ] `.env.local.example` with placeholder values for all env vars (DATABASE_URL, DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, CRON_SECRET)

## Technical Notes

Use `openai` SDK pointed at `https://api.deepseek.com/v1` for Deepseek V4 Flash compatibility.

## Dependencies

(none)
