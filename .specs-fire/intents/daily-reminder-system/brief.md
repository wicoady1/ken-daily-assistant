---
id: daily-reminder-system
title: Daily Reminder System
status: completed
created: 2026-05-15T10:00:00Z
completed_at: 2026-05-15T04:00:50.287Z
---

# Intent: Daily Reminder System

## Goal

Build a Vercel-ready full-stack daily reminder system that captures notes via a simple web UI and sends a summarized, prioritized to-do list via Telegram bot every 7AM WIB on workdays (Mon–Fri).

## Users

Single user (personal daily assistant). No authentication required.

## Problem

The user takes notes throughout the day but lacks a structured morning summary that surfaces urgent/important follow-ups for today and items to prepare ahead for future days.

## Success Criteria

- Save freeform notes via a simple text-area web UI daily
- Telegram bot sends a prioritized to-do list at 7AM WIB on workdays (Mon–Fri)
- AI summary correctly categorizes items as urgent/important follow-ups vs. prepare-ahead
- Notes persist reliably via Vercel Postgres
- System runs entirely on Vercel (Next.js + Cron Jobs + Postgres, zero external infra)

## Constraints

- Hosted on Vercel only: Next.js (App Router) + Vercel Cron Jobs + Vercel Postgres
- AI summarization: Deepseek V4 Flash (effort: medium)
- Delivery channel: Telegram bot (existing token, user-provided via env var)
- Single user, no authentication
- Timezone: Asia/Jakarta (WIB / GMT+7)
- Notes input: simple freeform text area (no rich text, no markdown)

## Notes

(none)
