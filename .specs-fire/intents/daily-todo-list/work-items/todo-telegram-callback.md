---
id: todo-telegram-callback
title: To-Do Telegram Callback Handler
intent: daily-todo-list
complexity: medium
mode: confirm
status: completed
depends_on:
  - todo-service
  - todo-telegram-delivery
created: 2026-05-15T05:30:00Z
run_id: run-ken-daily-assitant-006
completed_at: 2026-05-15T06:00:56.955Z
---

# Work Item: To-Do Telegram Callback Handler

## Description

Create an API route (`app/api/telegram/webhook/route.ts`) that receives Telegram callback queries when the user clicks ✓ Done or ✕ Dismiss buttons on to-do items. The handler parses the callback data, updates the item status in the database, edits the Telegram message to reflect the change, and answers the callback query.

Key behaviors:
- Parse callback query from Telegram update payload
- Extract `todo:{id}:{action}` from callback data
- Call `markDone(id)` or `markDismissed(id)` from todo-service
- Edit the original message to reflect the updated item (strikethrough for done, removed for dismissed)
- Answer the callback query with a toast notification

## Acceptance Criteria

- [ ] `app/api/telegram/webhook/route.ts` handles POST requests from Telegram
- [ ] Validates Telegram update is a callback_query
- [ ] Parses `todo:{id}:{action}` callback data format
- [ ] Calls todo-service to update item status
- [ ] Edits the original message via `editMessageReplyMarkup` or `editMessageText` to update the visible list
- [ ] Answers callback query with `answerCallbackQuery` API call
- [ ] Handles errors gracefully (invalid callback data, DB errors) — never leaves callback unanswered
- [ ] Webhook setup: documented or automated via `/api/telegram/setup` endpoint
- [ ] Unit tests: callback parsing, status update, message edit call structure

## Technical Notes

The Telegram webhook needs to be registered once (pointing to `https://{domain}/api/telegram/webhook`). This can be done via the `setWebhook` API. The bot token is the same. The route should be accessible without CRON_SECRET (Telegram sends updates directly). Consider adding a `X-Telegram-Bot-Api-Secret-Token` header check for security.

## Dependencies

- todo-service
- todo-telegram-delivery
