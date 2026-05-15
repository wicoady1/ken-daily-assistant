import { boolean, date, index, integer, pgTable, serial, text, timestamp, varchar, uniqueIndex } from "drizzle-orm/pg-core";

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
  content: text("content").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const cronExecutions = pgTable(
  "cron_executions",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    action: varchar("action", { length: 50 }).notNull().default("daily-reminder"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    error: text("error"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueDateAction: uniqueIndex("cron_executions_date_action_key").on(table.date, table.action),
  })
);

export const todoItems = pgTable(
  "todo_items",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    title: text("title").notNull(),
    is_urgent: boolean("is_urgent").notNull().default(false),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    note_id: integer("note_id").references(() => notes.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    dateStatusIdx: index("todo_items_date_status_idx").on(table.date, table.status),
    noteIdIdx: index("todo_items_note_id_idx").on(table.note_id),
  })
);
