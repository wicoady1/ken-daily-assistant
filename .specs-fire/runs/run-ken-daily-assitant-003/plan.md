---
run: run-ken-daily-assitant-003
work_item: cron-scheduler
intent: daily-reminder-system
mode: validate
checkpoint: plan
approved_at: ""
---

# Implementation Plan: Cron Scheduler & Orchestrator

Based on approved design document (checkpoint 1).

## Implementation Checklist

Based on approved design doc `cron-scheduler-design.md`:

- [ ] 1. Add `cron_executions` table to drizzle schema (`db/schema.ts`)
- [ ] 2. Generate migration for new table
- [ ] 3. Create `app/api/cron/route.ts` with CRON_SECRET header validation
- [ ] 4. Implement dedup: `INSERT INTO cron_executions`, catch unique violation
- [ ] 5. Implement WIB date helper for yesterday computation
- [ ] 6. Fetch yesterday's notes: direct DB query
- [ ] 7. Wire orchestration: fetch → summarizeNotes() → sendDailyReminder()
- [ ] 8. Fallback: send raw notes if summarization fails
- [ ] 9. Update cron_executions status to completed/failed
- [ ] 10. Add `?force=true` support (bypasses dedup)
- [ ] 11. Create `vercel.json` with cron config (`0 0 * * 1-5`)
- [ ] 12. Update `.env.local.example` with `CRON_SECRET`

## Key Design Decisions (from approved design doc)

| Decision | Choice |
|----------|--------|
| Timezone | `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' })` |
| Dedup | Postgres `cron_executions` table with `UNIQUE(date, action)` |
| Content fetching | Direct DB query (not internal HTTP) |
| Auth | `Authorization: Bearer {CRON_SECRET}` |
| Failure fallback | Send raw notes as plain text |
| Cron expr | `0 0 * * 1-5` UTC (= 7AM WIB Mon-Fri) |

## Files to Create

| File | Purpose |
|------|---------|
| `app/api/cron/route.ts` | Cron trigger handler with orchestration |
| `vercel.json` | Vercel Cron Job configuration |

## Files to Modify

| File | Changes |
|------|---------|
| `db/schema.ts` | Add `cron_executions` table |
| `.env.local.example` | Add `CRON_SECRET` entry |

## Tests

| Test File | Coverage |
|-----------|----------|
| `app/api/cron/route.test.ts` | Auth validation, dedup logic, orchestration flow |

---

This is Checkpoint 2 of Validate mode. Approve implementation plan? [Y/n]