---
id: todo-service
title: To-Do Service Layer
intent: daily-todo-list
complexity: medium
mode: confirm
status: completed
depends_on:
  - todo-db-schema
  - todo-llm-extraction
created: 2026-05-15T05:30:00Z
run_id: run-ken-daily-assitant-005
completed_at: 2026-05-15T05:55:32.195Z
---

# Work Item: To-Do Service Layer

## Description

Build the service layer (`lib/todo-service.ts`) that manages the lifecycle of to-do items: saving extracted items to DB, fetching pending items from previous days, carrying forward unfinished items, and deduplicating when combining with new items.

Key behaviors:
- `generateTodoList(rawText: string, dateStr: string)`: Calls LLM extraction, saves new items to DB, carries forward pending items from previous days, returns the combined list
- Carry-forward: query all items with `status = 'pending'` and `date < today`, combine with newly extracted items
- Deduplication: if a new item's title is very similar to an existing pending item (fuzzy match), skip the duplicate
- Status updates: `markDone(id)`, `markDismissed(id)` — update individual item status
- `getTodosForDate(dateStr)`: query all pending items for a given date

## Acceptance Criteria

- [ ] `lib/todo-service.ts` created with exported functions
- [ ] `generateTodoList(rawText, dateStr)` flow: extract → save new → fetch carry-forward → merge → return
- [ ] Carry-forward: pending items from all previous dates are retrieved
- [ ] Deduplication: near-identical titles don't create duplicates
- [ ] `markDone(id)` and `markDismissed(id)` update individual items
- [ ] `getTodosForDate(dateStr)` returns pending items for a specific date
- [ ] Uses Drizzle ORM with existing `db` connection from `@/db`
- [ ] Unit tests cover: extraction + save, carry-forward, dedup, status updates

## Technical Notes

Import `db` from `@/db` and `todoItems` from `@/db/schema`. Use drizzle-orm `eq`, `and`, `lt` for queries. For deduplication, use simple fuzzy matching (e.g., normalized lowercase comparison or edit distance threshold). The carry-forward should preserve the original `date` on old items (so we know when they were created) and only create new rows for newly extracted items.

## Dependencies

- todo-db-schema
- todo-llm-extraction
