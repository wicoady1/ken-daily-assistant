---
id: notes-ui
title: Notes UI
intent: daily-reminder-system
complexity: medium
mode: confirm
status: completed
depends_on:
  - notes-api
created: 2026-05-15T10:00:00Z
run_id: run-ken-daily-assitant-002
completed_at: 2026-05-15T03:38:48.573Z
---

# Work Item: Notes UI

## Description

Build the main page with a simple text area for capturing today's notes. Loads existing note for today on mount. Shows yesterday's notes below for reference. Clean, responsive, mobile-friendly design.

## Acceptance Criteria

- [ ] Homepage (`/`) shows today's date prominently (formatted for display)
- [ ] Large text area loads existing note for today (fetched via `GET /api/notes?date=today`) on page load
- [ ] Save button persists note content via `POST /api/notes` with today's date
- [ ] Autosave triggers after user stops typing (debounced, ~2 seconds)
- [ ] Save confirmation indicator (e.g., "Saved" badge that fades)
- [ ] Below today's input, displays yesterday's note (fetched via `GET /api/notes?date=yesterday`) as read-only reference
- [ ] Responsive layout — works on mobile and desktop
- [ ] Clean, minimal design — single column centered layout
- [ ] Loading and error states handled for both API calls

## Technical Notes

Client component (`"use client"`) for interactivity. Use `fetch` to call the internal API routes. Debounce save calls to avoid excessive writes.

## Dependencies

- notes-api
