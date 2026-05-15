---
run: run-ken-daily-assitant-002
work_item: notes-api
intent: daily-reminder-system
mode: confirm
checkpoint: plan
approved_at: ""
---

# Implementation Plan: Notes API

## Approach

Create two Next.js App Router route handlers (GET + POST) at `app/api/notes/route.ts` that interact with the `notes` table via Drizzle. A separate `lib/wib-date.ts` utility handles WIB timezone date computation. GET supports `?date=today`, `?date=yesterday`, and `?date=YYYY-MM-DD`. POST upserts note content by date.

## Files to Create

| File | Purpose |
|------|---------|
| `lib/wib-date.ts` | WIB timezone date helpers (today, yesterday, format YYYY-MM-DD) |
| `app/api/notes/route.ts` | GET and POST route handlers for notes CRUD |
| `app/api/notes/route.test.ts` | Integration tests for notes API endpoints |

## Files to Modify

| File | Changes |
|------|---------|
| (none) | |

## Tests

| Test File | Coverage |
|-----------|----------|
| `app/api/notes/route.test.ts` | GET (today, yesterday, specific date, 404), POST (create, upsert, validation, max length) |

---

---

## Work Item: notes-ui

### Approach

Convert `app/page.tsx` to a client component (`"use client"`) with full notes UI:
- Today's date header (formatted, e.g. "Thursday, May 14, 2026")
- Large text area loading existing note via `GET /api/notes?date=today`
- Save button + autosave (2s debounce) via `POST /api/notes`
- "Saved" confirmation badge with fade animation
- Yesterday's notes section below as read-only reference
- Loading spinners and error messages for API calls

Update `app/globals.css` with responsive, mobile-friendly layout styles.

### Files to Create

| File | Purpose |
|------|---------|
| (none) | |

### Files to Modify

| File | Changes |
|------|---------|
| `app/page.tsx` | Replace placeholder with full notes UI client component |
| `app/globals.css` | Add notes UI styles (layout, form, responsive) |

### Tests

| Test File | Coverage |
|-----------|----------|
| (none — UI rendering tests deferred; manual verification) | |

---

---

---

## Work Item: llm-summarization

### Approach

Create `lib/summarize.ts` with `summarizeNotes(rawText: string)` that:
1. Reads `DEEPSEEK_API_KEY` and `DEEPSEEK_BASE_URL` from env vars
2. Calls Deepseek V4 Flash via OpenAI SDK (`openai` package with `baseURL: https://api.deepseek.com/v1`)
3. Sends a system prompt instructing the model to categorize notes into `followUpToday` (urgent/important) and `prepareAhead` (future prep)
4. Expects JSON response `{ followUpToday: string[], prepareAhead: string[], raw: string }`
5. Handles errors: timeout (30s), malformed JSON, API errors
6. Logs token usage (prompt_tokens, completion_tokens, total_tokens)

### Files to Create

| File | Purpose |
|------|---------|
| `lib/summarize.ts` | Deepseek V4 Flash summarization function |
| `lib/summarize.test.ts` | Unit tests for summarization |

### Files to Modify

| File | Changes |
|------|---------|
| (none) | |

### Tests

| Test File | Coverage |
|-----------|----------|
| `lib/summarize.test.ts` | JSON parsing, error handling, env validation, token logging |

---

Approve this plan? [Y/n]