import { date, pgTable, serial, text, timestamp, varchar, uniqueIndex } from "drizzle-orm/pg-core";

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
