---
id: cron-scheduler
title: Cron Scheduler & Orchestrator
intent: daily-reminder-system
complexity: high
mode: validate
status: completed
depends_on:
  - notes-api
  - llm-summarization
  - telegram-delivery
created: 2026-05-15T10:00:00Z
run_id: run-ken-daily-assitant-003
completed_at: 2026-05-15T04:00:50.278Z
---

# Work Item: Cron Scheduler & Orchestrator

## Description

Configure the Vercel Cron Job and build the orchestrator API route that ties everything together: at 7AM WIB on workdays, fetch yesterday's notes, run summarization, and send the result via Telegram. This is the central integration point of the system.

## Acceptance Criteria

- [ ] `vercel.json` defines a cron job at `0 0 * * 1-5` (midnight UTC = 7AM WIB, Mon–Fri)
- [ ] Cron hits `GET /api/cron` with an `Authorization` header containing `CRON_SECRET`
- [ ] `/api/cron` route:
  - Validates the `CRON_SECRET` from the Authorization header (rejects unauthorized requests)
  - Computes "yesterday" in WIB timezone
  - Fetches yesterday's notes via internal call to `GET /api/notes?date=yesterday`
  - If no notes found, logs and skips (no Telegram message)
  - Calls `summarizeNotes()` on the content
  - Calls `sendDailyReminder()` with the categorized result
  - Returns JSON status response
- [ ] Deduplication: stores last processed date, skips if already sent today (prevents cron double-fire)
- [ ] Logs each run: timestamp, date processed, result status, errors if any
- [ ] Error handling: if summarization fails, sends a fallback plain-text Telegram message with raw notes
- [ ] Manual test trigger: hitting `/api/cron?force=true` with valid secret runs unconditionally (bypasses dedup check)

## Technical Notes

Vercel Cron Jobs run at UTC with minute-level precision. 7AM WIB = 0:00 UTC. Cron expression `0 0 * * 1-5` = every Mon–Fri at midnight UTC.

Deduplication approach: store a key `last-processed:{date}` in Postgres (or in-memory if acceptable for MVP). Check at start of each cron invocation.

Consider using `waitUntil` in Next.js edge/route handlers for proper async completion.

This item requires a **design document** (validate mode). Key decisions: deduplication strategy, error recovery flow, timezone handling approach.

## Dependencies

- notes-api
- llm-summarization
- telegram-delivery
