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

function mapRow(r: typeof todoItems.$inferSelect): TodoItem {
  return {
    id: r.id,
    date: r.date,
    title: r.title,
    is_urgent: r.is_urgent,
    status: r.status as TodoItem["status"],
    created_at: r.created_at!,
  };
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

  return rows.map(mapRow);
}

export async function getAllTodosForDate(dateStr: string): Promise<TodoItem[]> {
  const rows = await db
    .select()
    .from(todoItems)
    .where(eq(todoItems.date, dateStr))
    .orderBy(todoItems.is_urgent, todoItems.created_at);

  return rows.map(mapRow);
}

export async function getTodoItem(id: number): Promise<TodoItem | null> {
  const rows = await db
    .select()
    .from(todoItems)
    .where(eq(todoItems.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return mapRow(row);
}

export async function generateTodoList(
  rawText: string,
  dateStr: string
): Promise<TodoItem[]> {
  // Get old pending items to pass as context to LLM
  const oldPendingRows = await db
    .select()
    .from(todoItems)
    .where(
      and(
        eq(todoItems.status, "pending"),
        lt(todoItems.date, dateStr)
      )
    )
    .orderBy(todoItems.created_at);

  const oldTitles = oldPendingRows.map((r) => r.title);

  // Let LLM generate new items, aware of old pending ones
  const newExtracted: ExtractedTodo[] = await extractTodos(rawText, oldTitles);

  // Insert only genuinely new items (not matching old pending ones)
  for (const item of newExtracted) {
    // Note: type imports inside loop are fine, they're hoisted
    const isAlreadyPending = oldTitles.some(
      (oldTitle) => oldTitle.toLowerCase().trim() === item.title.toLowerCase().trim()
    );
    if (!isAlreadyPending) {
      await db.insert(todoItems).values({
        date: dateStr,
        title: item.title,
        is_urgent: item.is_urgent,
        status: "pending",
      });
    }
  }

  // Move old pending items to today's date (carry forward)
  for (const row of oldPendingRows) {
    await db
      .update(todoItems)
      .set({ date: dateStr as unknown as string })
      .where(eq(todoItems.id, row.id));
  }

  const allRows = await db
    .select()
    .from(todoItems)
    .where(
      and(
        eq(todoItems.date, dateStr),
        eq(todoItems.status, "pending")
      )
    )
    .orderBy(todoItems.is_urgent, todoItems.created_at);

  const allItems = allRows.map(mapRow);

  allItems.sort((a, b) => {
    if (a.is_urgent !== b.is_urgent) return a.is_urgent ? -1 : 1;
    return a.created_at.getTime() - b.created_at.getTime();
  });

  return allItems;
}
