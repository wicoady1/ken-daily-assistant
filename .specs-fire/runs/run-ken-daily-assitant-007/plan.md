# Implementation Plan

## Run: run-ken-daily-assitant-007
## Work Item: todo-cron-integration (validate)

Based on approved design doc.

### Implementation Checklist

- [ ] Add imports: `generateTodoList`, `sendTodoList`
- [ ] Create `sendDailyTodos(noteContent, date)` helper function
- [ ] Insert todo generation call before return in fallback path (after line 122)
- [ ] Insert todo generation call before return in success path (after line 133)
- [ ] Update response to include `todoCount`
- [ ] Update existing cron route tests
- [ ] Add edge case tests

### Files to Create
- (none)

### Files to Modify
- `app/api/cron/route.ts` — Add to-do generation after summary delivery

### Tests
- Full flow: notes → summary → todos → verify Telegram API called with both summary and todo list
- Edge case: LLM extraction fails → summary still sent, todo skipped
- Edge case: no items extracted → summary sent, no todo message
- Edge case: Telegram delivery fails for todos → summary unaffected

---

This is Checkpoint 2 of Validate mode.
Approve implementation plan? [Y/n/edit]
