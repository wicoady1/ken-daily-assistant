---
id: notes-api
title: Notes API
intent: daily-reminder-system
complexity: medium
mode: confirm
status: completed
depends_on:
  - database-setup
created: 2026-05-15T10:00:00Z
run_id: run-ken-daily-assitant-002
completed_at: 2026-05-15T03:32:58.540Z
---

# Work Item: Notes API

## Description

Create Next.js API routes for saving and retrieving daily notes. POST endpoint upserts note content by date. GET endpoint retrieves a note for a given date. Date handling must respect the WIB (Asia/Jakarta) timezone.

## Acceptance Criteria

- [ ] `POST /api/notes` accepts JSON body `{ date: string (YYYY-MM-DD), content: string }` and upserts by date
- [ ] `GET /api/notes?date=YYYY-MM-DD` returns `{ date, content, created_at, updated_at }` or 404 if no note exists
- [ ] `GET /api/notes?date=today` returns today's note (WIB date computed server-side)
- [ ] `GET /api/notes?date=yesterday` returns yesterday's note (WIB date computed server-side)
- [ ] Missing `date` in GET defaults to today (WIB)
- [ ] Proper HTTP status codes: 200 success, 400 bad request, 404 not found, 500 server error
- [ ] Input validation: content max 10000 chars, date must be valid ISO format
- [ ] WIB timezone used for all server-side date computations (e.g., `"today"` = WIB date)

## Technical Notes

Use Next.js App Router route handlers in `app/api/notes/route.ts`. Compute WIB dates using `Intl.DateTimeFormat` or date-fns-tz. Avoid raw `new Date()` for date boundaries.

## Dependencies

- database-setup
