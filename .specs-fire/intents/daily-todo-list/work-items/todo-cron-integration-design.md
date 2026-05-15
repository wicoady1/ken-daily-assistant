---
work_item: todo-cron-integration
intent: daily-todo-list
created: 2026-05-15T06:01:00Z
mode: validate
checkpoint_1: pending
---

# Design: To-Do Cron Integration

## Summary

Extend the existing `/api/cron` route to generate and deliver a daily to-do list after the existing summary is sent. This adds to-do extraction via LLM, carry-forward of unfinished items, and Telegram delivery with inline buttons — all as a post-summary step in the same cron request.

## Scope

**In Scope:**
- Modify `app/api/cron/route.ts` to call to-do generation after summary delivery
- LLM extraction failure handling (catch & log, don't break cron)
- Empty to-do handling (skip silently, no empty message)
- Telegram delivery error handling (log, don't roll back)
- Tests for the full cron flow with to-do integration

**Out of Scope:**
- Separate cron job or schedule for to-dos (reuses existing cron)
- To-do management UI or dashboard
- Telegram webhook registration automation
- Multiple Telegram chat support

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| To-do generation timing | After summary sent, in same request | Reuses existing cron; no need for separate schedule or state management |
| Error isolation | Catch errors per-step, continue flow | LLM or Telegram failure shouldn't block the summary or vice versa |
| Skip condition | No items extracted → no message sent | Empty to-do messages are noise; user will see nothing new |
| cron_executions status | Single "completed" status, log todo outcome | Simplifies state tracking; no need for two-phase status |

## Data Models Affected

### Creates
(none — model already created by todo-db-schema)

### Modifies
- **cron_executions**: No schema changes. Status remains "completed". Todo outcome logged via console.

## Technical Approach

### Architecture

```
Current flow:
GET /api/cron (authorized)
  → fetch yesterday's notes
  → summarizeNotes() via DeepSeek
  → sendDailyReminder() via Telegram
  → return response

Extended flow:
GET /api/cron (authorized)
  → fetch yesterday's notes
  → summarizeNotes() via DeepSeek
  → sendDailyReminder() via Telegram
  → generateTodoList(note.content, yesterdayDate)  ← NEW
    ├─ extractTodos() via DeepSeek
    ├─ carry-forward pending items from DB
    ├─ deduplicate & save
    └─ return combined items
  → if items exist: sendTodoList(items) via Telegram  ← NEW
  → return response
```

### Integration Point

The to-do integration is inserted into the cron route AFTER the summary send block. There are two insertion points in the existing code:

**Insertion Point A** (after success path, line 124-133):
After `sendDailyReminder(summaryResult, yesterdayDate)` succeeds, call:
```typescript
const todoItems = await generateTodoList(note.content, yesterdayDate);
if (todoItems.length > 0) {
  await sendTodoList(todoItems, yesterdayDate);
}
```

**Insertion Point B** (after fallback path, line 111-122):
After `sendDailyReminder({...}, yesterdayDate)` fallback, call the same.

The insertion should be done in a single place after both paths converge — i.e., after the summary is sent (either normal or fallback).

### Error Handling

```
generateTodoList:
  ├─ LLM extraction fails → catch, log, return empty []
  └─ DB error → catch, log, return empty []

sendTodoList:
  ├─ Telegram API error → catch, log, skip (non-fatal)
  └─ Rate limit → retry once (built into sendTodoList)
```

### Response

The response body is extended with todo-related fields:
```typescript
{
  status: "sent",
  date: yesterdayDate,
  followUpCount: 3,
  prepareAheadCount: 2,
  todoCount: 5,  // NEW — number of to-do items
}
```

## Affected Files

| File | Action | Purpose |
|------|--------|---------|
| `app/api/cron/route.ts` | Modify | Add to-do generation and delivery after summary |

## Security Considerations

- No new security concerns — same CRON_SECRET authorization applies
- Telegram webhook endpoint (separate) handles callback queries without CRON_SECRET, but uses bot token for Telegram API calls

## Integration Points

| System | Type | Purpose |
|--------|------|---------|
| DeepSeek API | LLM (existing) | Extract to-do items from notes |
| Telegram Bot API | HTTP (existing) | Send to-do list with inline buttons |
| PostgreSQL | DB (existing) | Store/query to-do items, cron execution tracking |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM extraction adds latency to cron | Cron timeout | Extraction runs after summary; if it fails, skip and log; timeouts affect only todo, not summary |
| To-do items from old dates accumulate | Noise | Carry-forward only includes pending items; auto-dismiss after X days if needed (future) |
| Double execution edge case | Duplicate to-do messages | `tryInsertExecution()` dedup at cron start prevents this |

## Implementation Checklist

- [ ] Add import: `{ generateTodoList } from "@/lib/todo-service"` and `{ sendTodoList } from "@/lib/telegram-todo"`
- [ ] After the summary is sent block (both success and fallback), insert to-do generation
- [ ] If items exist, call `sendTodoList`; if empty, skip
- [ ] Wrap in try-catch for error isolation
- [ ] Extend response with `todoCount` field
- [ ] Update existing cron route tests for to-do integration
- [ ] Add edge case tests: LLM failure, empty items, Telegram failure
- [ ] Run full test suite

---
*Generated by specs.md - fabriqa.ai FIRE Flow | Checkpoint 1*
