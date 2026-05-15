---
id: todo-llm-extraction
title: To-Do LLM Extraction
intent: daily-todo-list
complexity: medium
mode: confirm
status: completed
depends_on: []
created: 2026-05-15T05:30:00Z
run_id: run-ken-daily-assitant-004
completed_at: 2026-05-15T05:52:58.916Z
---

# Work Item: To-Do LLM Extraction

## Description

Create a new LLM prompt and extraction function (`lib/extract-todos.ts`) that converts unstructured daily notes into structured, actionable to-do items. The AI acts as a "Tech Enabler" personal assistant for a quick commerce business, understanding the operational context.

Key behaviors:
- Extract discrete, actionable tasks from notes (not vague observations)
- Determine urgency: mark items as "URGENT" when they involve system outages, critical bugs, time-sensitive operations, or blockers (sparingly, not blanket)
- Understand quick commerce context: dark stores, delivery ops, inventory, supplier issues, system health, automation
- Return structured JSON with title and is_urgent fields

## Acceptance Criteria

- [ ] `lib/extract-todos.ts` created with `extractTodos(rawText: string): Promise<TodoItem[]>` exported function
- [ ] Prompt includes system persona as Tech Enabler for quick commerce (Astro Indonesia context)
- [ ] Prompt returns structured JSON: `{ items: [{ title: string, is_urgent: boolean }] }`
- [ ] Robust parsing handles markdown code blocks, plain JSON, fallback line parsing
- [ ] Empty input returns empty array
- [ ] Token usage is logged (same pattern as `summarize.ts:129-133`)
- [ ] Uses same DeepSeek client/config as `summarize.ts`
- [ ] Unit tests: valid notes produce items, empty notes return [], parsing handles edge cases

## Technical Notes

Reuse the DeepSeek client pattern from `lib/summarize.ts:9-21`. Use `deepseek-chat` model. The prompt should be separate from the summarization prompt (separate LLM call) to avoid changing existing behavior. The to-do extraction prompt should be more structured, asking for specific actionable items rather than categories.

## Dependencies

(none)
