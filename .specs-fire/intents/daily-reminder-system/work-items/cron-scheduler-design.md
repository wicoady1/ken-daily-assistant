---
work_item: cron-scheduler
intent: daily-reminder-system
created: "2026-05-15T10:00:00Z"
mode: validate
checkpoint_1: approved
---

# Design: Cron Scheduler & Orchestrator

## Summary

The cron scheduler is the central orchestrator that ties the system together. At 7AM WIB (0:00 UTC) on workdays, it fetches yesterday's notes, runs AI summarization, and delivers the result via Telegram — with deduplication and graceful fallback on failure.

## Scope

**In Scope:**
- Vercel Cron Job configuration (`vercel.json`)
- `/api/cron` handler with authorization
- Deduplication via `cron_executions` table
- Orchestration: fetch notes → summarize → send Telegram
- Fallback to raw notes if summarization fails
- Manual test trigger (`?force=true`)
- WIB timezone computation (server-side, no library needed)

**Out of Scope:**
- Retry logic with backoff (MVP — manual retry via `?force=true`)
- Metrics/analytics dashboard
- Customizable schedule per user (hard-coded 7AM WIB weekdays)

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Timezone handling | `Intl.DateTimeFormat` with `Asia/Jakarta` | Built-in Node.js API, no dependencies. Produces YYYY-MM-DD consistently including DST/no-DST zones |
| Deduplication strategy | Postgres `cron_executions` table with `UNIQUE(date, action)` | Already have Postgres, no new infra. INSERT-first approach: insert row → if unique violation, skip. Reliable, survives cold starts |
| Content fetching | Direct DB query in cron handler | Avoids internal HTTP call to `/api/notes`. Cron handler already server-side, can import `db` directly. One less failure point |
| Secret validation | `Authorization: Bearer {CRON_SECRET}` header | Standard security practice. Vercel Cron sends this header automatically. Query param fallback only for `?force=true` manual testing |
| Summarization failure | Fallback: send raw notes as plain text | User gets something rather than silence. "AI summarization unavailable — here are your raw notes from yesterday" |
| Cron expression | `0 0 * * 1-5` (UTC) | 0:00 UTC = 7:00 AM WIB (UTC+7). Mon–Fri only, matching "workdays" requirement |

## Data Models Affected

### Creates
- **`cron_executions`**: `id SERIAL PK`, `date DATE NOT NULL`, `action VARCHAR(50) DEFAULT 'daily-reminder'`, `status VARCHAR(20) DEFAULT 'pending'`, `error TEXT`, `created_at TIMESTAMPTZ DEFAULT NOW()`, **UNIQUE(date, action)** — Tracks which dates have been processed; dedup gate

## Technical Approach

### Architecture

```
Vercel Cron (0 0 * * 1-5 UTC)
  │
  ▼
GET /api/cron [Authorization: Bearer {SECRET}]
  │
  ├─ Validate CRON_SECRET ──────────────────→ 401 if invalid
  ├─ INSERT cron_executions (date, action) ──→ 200 if duplicate (already ran)
  ├─ Query notes WHERE date = yesterday(WIB) → 200 if none (nothing to send)
  ├─ summarizeNotes(content)
  │   ├─ Success → formatted to-do list
  │   └─ Failure → flag fallback = true
  ├─ sendDailyReminder(chatId, result)
  │   ├─ Success → UPDATE status = 'completed'
  │   └─ Failure → UPDATE status = 'failed', error = msg
  └─ Return 200 { status, date, fallback }
```

### Data Flow

```
cron trigger → /api/cron
  ├── (1) Dedup: INSERT cron_executions VALUES (yesterday, 'daily-reminder', 'processing')
  │         UNIQUE violation? → already processed → 200 OK
  ├── (2) Fetch: SELECT * FROM notes WHERE date = '2026-05-14' (WIB yesterday)
  │         No rows? → log, 200 OK
  ├── (3) Summarize: await summarizeNotes(notes.content)
  │         Error? → fallback_text = notes.content (raw)
  ├── (4) Send: await sendDailyReminder(chatId, result || fallback_text)
  └── (5) Log: UPDATE cron_executions SET status = 'completed'|'failed'
```

### API Changes

- `GET /api/cron` — **NEW** cron trigger endpoint (called by Vercel Cron only)
- `GET /api/cron?force=true` — **NEW** manual test trigger (bypasses dedup, requires valid secret)

### Database Changes

```sql
CREATE TABLE cron_executions (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  action VARCHAR(50) NOT NULL DEFAULT 'daily-reminder',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, action)
);
```

## Dependencies

- notes-api (notes data fetching)
- llm-summarization (AI summarization call)
- telegram-delivery (Telegram bot message send)

## Affected Files

| File | Action | Purpose |
|------|--------|---------|
| `vercel.json` | CREATE | Cron job config (`0 0 * * 1-5`) |
| `db/schema.ts` | MODIFY | Add `cron_executions` table definition |
| `app/api/cron/route.ts` | CREATE | Cron handler with orchestration logic |
| `lib/summarize.ts` | CREATE | Summarization wrapper |
| `lib/telegram.ts` | CREATE | Telegram send wrapper |
| `.env.local.example` | MODIFY | Add `CRON_SECRET` entry |

## Integration Points

| System | Type | Purpose |
|--------|------|---------|
| Vercel Cron Jobs | Trigger | Invokes `/api/cron` on schedule with CRON_SECRET header |
| Vercel Postgres | Storage | `notes` table (read) + `cron_executions` table (write) |
| Deepseek V4 Flash | API call | Summarizes yesterday's notes into prioritized to-do list |
| Telegram Bot API | API call | Delivers the formatted to-do list to user's chat |

## Security Considerations

- **CRON_SECRET validation**: Every request must include `Authorization: Bearer {CRON_SECRET}`. Invalid/missing → 401. Prevents unauthorized triggering
- **No public exposure**: The `/api/cron` endpoint is only called by Vercel Cron (which sends the secret). Not linked from any page
- **Secret in env var only**: Never hard-coded, never in source. Generated via `openssl rand -hex 32`

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Vercel cron at-least-once delivery → duplicate messages | High | `UNIQUE(date, action)` on `cron_executions` blocks double-processing |
| Deepseek API down or rate limited | High | Fallback: send raw notes as plain-text Telegram message instead of nothing |
| WIB date miscalculation at UTC midnight boundary | Medium | Use `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' })` for server-side WIB date calc |
| Telegram send fails (bot blocked, token revoked) | Medium | Log error in `cron_executions.error`, status = 'failed', return 500 |
| CRON_SECRET leaked/misconfigured | Medium | Log unauthorized attempts. Use `openssl rand -hex 32` for strong secret |
| Vercel Postgres cold start delay | Low | Vercel Postgres keeps warm pools. 30s handler timeout |
| No notes for yesterday | Low | Graceful: log "no notes", return 200, no Telegram sent |

## Implementation Checklist

- [ ] 1. Add `cron_executions` table to drizzle schema (`db/schema.ts`)
- [ ] 2. Generate & run migration for new table
- [ ] 3. Create `/api/cron/route.ts` with CRON_SECRET header validation
- [ ] 4. Implement dedup check: `INSERT INTO cron_executions`, catch unique violation → skip
- [ ] 5. Implement WIB date helper: compute yesterday in `Asia/Jakarta`
- [ ] 6. Implement notes fetch: direct DB query for yesterday's note
- [ ] 7. Wire orchestration: fetch → `summarizeNotes()` → `sendDailyReminder()`
- [ ] 8. Implement fallback: on summarization error, send raw notes text
- [ ] 9. Update `cron_executions` status to `completed` or `failed` after run
- [ ] 10. Add `?force=true` support for manual testing (bypasses dedup)
- [ ] 11. Create `vercel.json` with cron config (`0 0 * * 1-5`)
- [ ] 12. Update `.env.local.example` with `CRON_SECRET` entry
- [ ] 13. Test: manual curl trigger with valid secret
- [ ] 14. Test: dedup verification (trigger twice, second returns 200 without sending)

---
*Checkpoint 1 approved: 2026-05-15T10:00:00Z*
