---
id: todo-telegram-delivery
title: To-Do Telegram Delivery
intent: daily-todo-list
complexity: low
mode: autopilot
status: completed
depends_on:
  - todo-db-schema
created: 2026-05-15T05:30:00Z
run_id: run-ken-daily-assitant-005
completed_at: 2026-05-15T05:56:31.411Z
---

# Work Item: To-Do Telegram Delivery

## Description

Create a function (`lib/telegram.ts` extension or new file) that formats the to-do list as a Telegram message with HTML formatting and inline keyboard buttons. Each to-do item gets ✓ Done and ✕ Dismiss buttons for user interaction.

Message format:
```
<b>✅ Daily To-Do — {date}</b>

<b>🔴 URGENT</b>
1. Fix payment gateway timeout [✓ Done] [✕ Dismiss]

<b>📋 Tasks</b>
2. Review inventory dashboard [✓ Done] [✕ Dismiss]
3. Update delivery route config [✓ Done] [✕ Dismiss]

<i>Generated from yesterday's notes</i>
```

## Acceptance Criteria

- [ ] `sendTodoList(items: TodoItem[], dateLabel: string)` function exported
- [ ] Message uses HTML parse mode with proper escaping
- [ ] URGENT items are grouped separately with 🔴 marker
- [ ] Each item has inline keyboard row: [✓ Done] [✕ Dismiss]
- [ ] Callback data encoded as `todo:{id}:{action}` format
- [ ] Empty list sends a friendly "No pending tasks" message
- [ ] Reuses same bot token and chat ID from existing `sendDailyReminder`
- [ ] Handles rate limiting (429) with retry (same pattern as existing)
- [ ] Unit test: message format correct, callback data structure valid

## Technical Notes

Extend `lib/telegram.ts` by adding `reply_markup.inline_keyboard` to the `sendMessage` API call, or create a separate `lib/telegram-todo.ts`. The `sendTelegram` private function in `lib/telegram.ts:44-58` currently doesn't accept `reply_markup` — either extend it with an optional parameter or create a new send function. Callback data should be compact JSON-encoded so the webhook handler can parse it reliably.

## Dependencies

- todo-db-schema
