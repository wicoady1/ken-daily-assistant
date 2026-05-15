import { db } from "@/db";
import { todoItems } from "@/db/schema";
import { eq, and, lt } from "drizzle-orm";
import { extractTodos, type ExtractedTodo } from "./extract-todos";

export interface TodoItem {
  id: number;
  date: string;
  title: string;
  is_urgent: boolean;
  status: "pending" | "done" | "dismissed";
  created_at: Date;
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().trim().replace(/[.!?,;:]+$/, "");
}

function isDuplicate(title: string, existingTitles: string[]): boolean {
  const normalized = normalizeTitle(title);
  return existingTitles.some((t) => normalizeTitle(t) === normalized);
}

export async function markDone(id: number): Promise<void> {
  await db
    .update(todoItems)
    .set({ status: "done", updated_at: new Date() })
    .where(eq(todoItems.id, id));
}

export async function markDismissed(id: number): Promise<void> {
  await db
    .update(todoItems)
    .set({ status: "dismissed", updated_at: new Date() })
    .where(eq(todoItems.id, id));
}

export async function getTodosForDate(dateStr: string): Promise<TodoItem[]> {
  const rows = await db
    .select()
    .from(todoItems)
    .where(
      and(
        eq(todoItems.date, dateStr),
        eq(todoItems.status, "pending")
      )
    )
    .orderBy(todoItems.is_urgent, todoItems.created_at);

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    title: r.title,
    is_urgent: r.is_urgent,
    status: r.status as TodoItem["status"],
    created_at: r.created_at!,
  }));
}

export async function generateTodoList(
  rawText: string,
  dateStr: string
): Promise<TodoItem[]> {
  const newExtracted: ExtractedTodo[] = await extractTodos(rawText);

  const carryForwardRows = await db
    .select()
    .from(todoItems)
    .where(
      and(
        eq(todoItems.status, "pending"),
        lt(todoItems.date, dateStr)
      )
    )
    .orderBy(todoItems.created_at);

  const carryForwardTitles = carryForwardRows.map((r) => r.title);

  const itemsToInsert = newExtracted.filter(
    (item) => !isDuplicate(item.title, carryForwardTitles)
  );

  for (const item of itemsToInsert) {
    await db.insert(todoItems).values({
      date: dateStr,
      title: item.title,
      is_urgent: item.is_urgent,
      status: "pending",
    });
  }

  const newSaved = await db
    .select()
    .from(todoItems)
    .where(
      and(
        eq(todoItems.date, dateStr),
        eq(todoItems.status, "pending")
      )
    )
    .orderBy(todoItems.is_urgent, todoItems.created_at);

  const allItems = [
    ...carryForwardRows.map((r) => ({
      id: r.id,
      date: r.date,
      title: r.title,
      is_urgent: r.is_urgent,
      status: r.status as TodoItem["status"],
      created_at: r.created_at!,
    })),
    ...newSaved.map((r) => ({
      id: r.id,
      date: r.date,
      title: r.title,
      is_urgent: r.is_urgent,
      status: r.status as TodoItem["status"],
      created_at: r.created_at!,
    })),
  ];

  allItems.sort((a, b) => {
    if (a.is_urgent !== b.is_urgent) return a.is_urgent ? -1 : 1;
    return a.created_at.getTime() - b.created_at.getTime();
  });

  return allItems;
}
