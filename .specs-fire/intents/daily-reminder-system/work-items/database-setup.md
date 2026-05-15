---
id: database-setup
title: Database Setup
intent: daily-reminder-system
complexity: low
mode: autopilot
status: completed
depends_on:
  - project-scaffold
created: 2026-05-15T10:00:00Z
run_id: run-ken-daily-assitant-001
completed_at: 2026-05-15T03:23:49.637Z
---

# Work Item: Database Setup

## Description

Define the Drizzle ORM schema for the `notes` table, configure the Vercel Postgres connection, generate and run the initial migration, and export the database client for use by API routes.

## Acceptance Criteria

- [ ] Drizzle schema defined in `db/schema.ts` with `notes` table (id: serial PK, date: date unique, content: text, created_at: timestamp, updated_at: timestamp)
- [ ] Vercel Postgres connection via `@vercel/postgres` + `drizzle-orm/pg-core`
- [ ] `db/index.ts` exports typed drizzle client
- [ ] `db/migrate.ts` script for running migrations
- [ ] Migration generated via `drizzle-kit generate`
- [ ] Migration applied successfully
- [ ] `notes` table created in Postgres and queryable

## Technical Notes

Use `drizzle-orm/node-postgres` with the `@vercel/postgres` `sql` client. The `date` field should be a `date` type (not timestamp) for date-based lookups and uniqueness by day.

## Dependencies

- project-scaffold
