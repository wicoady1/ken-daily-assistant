---
id: daily-todo-list
title: Daily To-Do List Generator
status: completed
created: 2026-05-15T05:30:00Z
completed_at: 2026-05-15T06:03:42.895Z
---

# Intent: Daily To-Do List Generator

## Goal

Extend the existing daily cron reminder to also generate an AI-powered to-do list from yesterday's notes. The AI acts as a "Tech Enabler" personal assistant for a quick commerce business (modeled after Astro Indonesia — on-demand grocery delivery), extracting actionable tasks from unstructured notes and delivering them via Telegram.

## Users

Tech/operations lead running a quick commerce business in Indonesia. Uses the system to log daily notes and receive AI-summarized reminders with actionable to-do items.

## Problem

Daily notes contain unstructured information — tasks, observations, issues, and ideas — that need to be converted into actionable, tracked to-do items. Currently the system only summarizes notes; it does not extract discrete tasks, track completion, or carry forward unfinished items. The user needs a structured task system integrated into the same daily Telegram reminder flow.

## Success Criteria

- AI generates a to-do list from yesterday's notes and sends it to the same Telegram chat after the daily summary
- Unfinished to-do items are carried forward to the next day and combined with new items from the latest notes
- AI intelligently marks truly critical items as "URGENT" (filtered, not blanket — only items requiring immediate attention)
- User can dismiss/remove irrelevant to-do items (via Telegram interaction or API)
- To-do items are persisted in the PostgreSQL database with status tracking (pending, done, dismissed)
- The system understands quick commerce tech/ops context (inventory, delivery, system health, supplier issues, automation, etc.)

## Constraints

- Must extend the existing `/api/cron` flow — not a separate cron job
- Must use the same Telegram channel (same `TELEGRAM_CHAT_ID` and bot)
- Must integrate with the existing `notes` and `cron_executions` DB schema
- LLM summarization and to-do extraction should be handled in a single pass or chained efficiently
- Telegram interactivity limited to what's available (inline buttons for dismiss/complete)

## Notes

Astro Indonesia is a quick-commerce startup providing 15-30 minute grocery delivery. The assistant should understand the operational landscape: dark stores/micro-fulfillment, last-mile delivery, inventory turnover, supplier reliability, system uptime, rider management, pricing/assortment, and promotional mechanics typical in Indonesian e-grocery.
