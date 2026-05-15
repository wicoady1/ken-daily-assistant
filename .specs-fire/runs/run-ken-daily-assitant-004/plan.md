# Implementation Plan

## Run: run-ken-daily-assitant-004
## Scope: batch (2 items)

---

## Work Item: todo-db-schema

### Approach

1. Add `todoItems` table to `db/schema.ts` using Drizzle ORM
   - Columns: id (serial PK), date (date), title (text), is_urgent (boolean, default false), status (varchar), note_id (int, nullable FK), created_at (timestamp), updated_at (timestamp)
   - Composite index on (date, status) and index on note_id
   - Follow existing pattern from notes and cronExecutions tables

2. Run `drizzle-kit generate` to produce migration SQL

3. Verify migration SQL is correct in `drizzle/` folder

### Files to Create
- (none — migration is auto-generated)

### Files to Modify
- `db/schema.ts` — Add `todoItems` table definition

### Tests
- Existing tests should continue to pass (no behavior changes)
- Can verify the table compiles correctly by running TypeScript check

---

## Work Item: todo-llm-extraction

### Approach

1. Create `lib/extract-todos.ts`:
   - `ExtractedTodo` interface: `{ title: string; is_urgent: boolean }`
   - `extractTodos(rawText: string): Promise<ExtractedTodo[]>` exported function
   - Reuse DeepSeek client pattern from `lib/summarize.ts` (same getClient helper)
   - System prompt: Tech Enabler persona for quick commerce (Astro-like), understanding dark stores, delivery ops, inventory, system health, automation
   - Prompt asks for structured JSON: `{ "items": [{ "title": "...", "is_urgent": true/false }] }`
   - Urgency criteria: system outages, critical bugs, time-sensitive ops, blockers (sparingly)
   - Robust parsing: markdown code blocks → plain JSON → fallback line parsing
   - Token usage logging

2. Create `lib/extract-todos.test.ts`:
   - Unit tests following same pattern as `lib/summarize.test.ts`
   - Mock OpenAI client
   - Test cases: empty input, valid JSON, markdown-wrapped JSON, API errors, null content, URGENT flag parsing

### Files to Create
- `lib/extract-todos.ts` — LLM extraction function
- `lib/extract-todos.test.ts` — Unit tests

### Files to Modify
- (none)

### Tests
- 7+ unit tests for `extractTodos`: empty input, valid response, markdown wrapping, malformed JSON fallback, API errors, null content, empty choices
