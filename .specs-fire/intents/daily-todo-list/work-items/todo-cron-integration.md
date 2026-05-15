---
id: todo-cron-integration
title: To-Do Cron Integration
intent: daily-todo-list
complexity: high
mode: validate
status: completed
depends_on:
  - todo-service
  - todo-telegram-delivery
  - todo-telegram-callback
created: 2026-05-15T05:30:00Z
run_id: run-ken-daily-assitant-007
completed_at: 2026-05-15T06:03:42.885Z
---

# Work Item: To-Do Cron Integration

## Description

Wire the to-do generation and delivery into the existing `/api/cron` route. After the daily summary is sent (or fallback), extract to-do items from the same notes, carry forward unfinished items, and send the combined to-do list to Telegram.

Flow extension (after existing summary sending):
```
1. notes fetched → 2. summarize → 3. send summary
                                      ↓
4. extract todos → 5. carry forward → 6. send todo list
```

Edge cases:
- LLM extraction fails → send fallback message "Unable to generate to-do list" (don't break the entire cron)
- No to-do items extracted → skip, don't send empty message
- Telegram delivery fails → log error, don't roll back
- Dedup already prevents double execution

## Acceptance Criteria

- [ ] `/api/cron/route.ts` extended: after summary sent, calls `generateTodoList(note.content, yesterdayDate)`
- [ ] To-do list is sent as a separate Telegram message (not as part of the summary)
- [ ] LLM extraction failure doesn't break the cron flow (catch and log)
- [ ] No items extracted → skip todo delivery entirely (no empty message)
- [ ] Telegram delivery failure is logged but doesn't affect cron execution status
- [ ] cron_executions entry reflects both summary and todo delivery status
- [ ] Integration test: full cron flow with notes that contain actionable items
- [ ] Edge case tests: LLM fails, no items, empty notes, Telegram fails

## Technical Notes

Modify `app/api/cron/route.ts:90-133`. The to-do step should be inserted after line 133 (after summary is sent and status updated). If summarization failed (usedFallback), the original raw notes are still available via `note.content` for extraction. Consider whether the cron_executions status should differentiate between "summary-only" and "summary+todos" — or keep it simple with just "completed".

## Dependencies

- todo-service
- todo-telegram-delivery
- todo-telegram-callback
