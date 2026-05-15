---
id: todo-db-schema
title: To-Do Database Schema
intent: daily-todo-list
complexity: low
mode: autopilot
status: completed
depends_on: []
created: 2026-05-15T05:30:00Z
run_id: run-ken-daily-assitant-004
completed_at: 2026-05-15T05:47:47.550Z
---

# Work Item: To-Do Database Schema

## Description

Create the `todo_items` table in the PostgreSQL database using Drizzle ORM. This table stores individual to-do items extracted from daily notes, with status tracking (pending, done, dismissed), urgency flag, and date-based grouping for carry-forward logic.

Columns:
- `id` — auto-increment primary key (serial)
- `date` — the date the item was extracted for (not null)
- `title` — the to-do item text (text, not null)
- `is_urgent` — boolean flag for AI-determined urgency (default false)
- `status` — varchar: `pending` | `done` | `dismissed` (default `pending`)
- `note_id` — optional FK to `notes.id` for traceability (nullable)
- `created_at` — timestamp with timezone (default now)
- `updated_at` — timestamp with timezone (default now)

## Acceptance Criteria

- [ ] `todo_items` table defined in `db/schema.ts` following existing patterns
- [ ] Migration SQL generated and ready to apply
- [ ] Index on `(date, status)` for efficient carry-forward queries
- [ ] Optional index on `note_id` for FK lookups
- [ ] All columns use appropriate Drizzle types matching existing schema conventions

## Technical Notes

Follow the pattern from `db/schema.ts:3-24`. Use `pgTable`, `serial`, `text`, `timestamp`, `varchar`, `boolean` from `drizzle-orm/pg-core`. Create a composite index on `(date, status)` since carry-forward queries will filter by `date` and `status = 'pending'`.

## Dependencies

(none)
