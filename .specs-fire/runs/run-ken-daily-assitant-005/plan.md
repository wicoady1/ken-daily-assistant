# Implementation Plan

## Run: run-ken-daily-assitant-005
## Scope: batch (2 items)

---

## Work Item: todo-service

### Approach

Create `lib/todo-service.ts` — the service layer managing to-do lifecycle:

1. **`generateTodoList(rawText, dateStr)`**:
   - Call `extractTodos(rawText)` to get new items from LLM
   - Fetch carry-forward items: query `todoItems` where `status = 'pending'` and `date < dateStr`
   - Deduplicate: normalize titles (lowercase, trim), skip new items with near-identical titles to carry-forward items
   - Insert new items into DB with `date = dateStr`, `status = 'pending'`
   - Return combined list (carry-forward + new items)

2. **`markDone(id)`** → update `status = 'done'` 
3. **`markDismissed(id)`** → update `status = 'dismissed'`
4. **`getTodosForDate(dateStr)`** → query `todoItems` where `date = dateStr`, ordered by creation

### Files to Create
- `lib/todo-service.ts` — Service layer
- `lib/todo-service.test.ts` — Unit tests

### Files to Modify
- (none)

### Tests
- Unit tests covering: generate (new + carry-forward), dedup, markDone, markDismissed, getTodosForDate
- Mock DB using same pattern as `cron/route.test.ts`
- Mock `extractTodos` function

---

## Work Item: todo-telegram-delivery

### Approach

Create `lib/telegram-todo.ts` — separate from the existing `lib/telegram.ts` to keep concerns clean.

1. `sendTodoList(items: TodoItem[], dateLabel: string)`:
   - Read TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from env
   - Format message: group URGENT items under 🔴 heading, non-urgent under 📋 heading
   - Each item gets inline keyboard: [✓ Done] [✕ Dismiss] with callback_data `todo:{id}:{action}`
   - Send via Telegram Bot API `sendMessage` with `reply_markup`
   - Empty list: send friendly "No pending tasks"
   - Rate limit retry (same pattern as `sendDailyReminder`)

2. Reuse `escapeHtml` from existing `lib/telegram.ts` (extract to shared utility if needed)

### Files to Create
- `lib/telegram-todo.ts` — To-do list delivery function
- `lib/telegram-todo.test.ts` — Unit tests

### Files to Modify
- (none)

### Tests
- Unit tests: message formatting (urgent grouped, non-urgent), inline keyboard structure, empty list, callback_data format, HTML escaping
