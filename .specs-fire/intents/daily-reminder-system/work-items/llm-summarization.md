---
id: llm-summarization
title: LLM Summarization
intent: daily-reminder-system
complexity: medium
mode: confirm
status: completed
depends_on:
  - project-scaffold
created: 2026-05-15T10:00:00Z
run_id: run-ken-daily-assitant-002
completed_at: 2026-05-15T03:41:45.591Z
---

# Work Item: LLM Summarization

## Description

Build the Deepseek V4 Flash integration that takes raw note text and returns a structured, categorized to-do list. The prompt must identify urgent/important follow-ups for today and items to prepare ahead for future days.

## Acceptance Criteria

- [ ] Function `summarizeNotes(rawText: string)` returns a structured result with categorized to-do items
- [ ] Calls Deepseek V4 Flash via OpenAI-compatible SDK (`openai` package pointed at Deepseek base URL)
- [ ] Prompt correctly instructs the model to:
  - Identify urgent/important items requiring follow-up today
  - Identify items to prepare ahead for future days
  - Return a clean to-do list structure
- [ ] Returns `{ followUpToday: string[], prepareAhead: string[], raw: string }` (JSON)
- [ ] Handles API errors: rate limits (retry once), timeouts (30s max), malformed responses
- [ ] Logs token usage for cost tracking
- [ ] Read API key and base URL from environment variables

## Technical Notes

Use `openai` client with `baseURL: "https://api.deepseek.com/v1"` and model `deepseek-chat`. Set `temperature: 0.3` for consistent summaries. Use structured output by appending "Respond in JSON format only" to the system prompt and wrapping user content accordingly. Effort level: medium (balanced prompt vs. few-shot examples in the prompt).

## Dependencies

- project-scaffold
