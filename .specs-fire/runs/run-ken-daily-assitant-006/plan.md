# Implementation Plan

## Run: run-ken-daily-assitant-006
## Work Item: todo-telegram-callback (confirm)

## Approach

Create `app/api/telegram/webhook/route.ts`:

1. **POST handler** that receives Telegram Update objects
2. Validates incoming payload has `callback_query` field
3. Parses `callback_data` format: `todo:{id}:{action}` where action is `done` or `dismiss`
4. Calls `markDone(id)` or `markDismissed(id)` from todo-service
5. Edits the original message via Telegram `editMessageText` API to show updated status (strikethrough for done, removed for dismissed)
6. Answers callback query via `answerCallbackQuery` API with a toast notification
7. Always returns 200 to Telegram (even on errors), logs errors internally

## Files to Create
- `app/api/telegram/webhook/route.ts` — Callback handler route
- `app/api/telegram/webhook/route.test.ts` — Unit tests

## Files to Modify
- (none)

## Tests
- Valid callback_query updates status and edits message
- Invalid callback_data format is handled gracefully
- Unknown action returns error
- Always answers callback query
- Returns 200 even when processing fails
