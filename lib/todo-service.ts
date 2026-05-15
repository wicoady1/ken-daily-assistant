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

  // Pass old pending items to LLM so it can avoid re-creating them
  const newExtracted: ExtractedTodo[] = await extractTodos(rawText, carryForwardTitles);

  // For each new item, check if it matches an old carry-forward item
  for (const newItem of newExtracted) {
    const matchIdx = carryForwardTitles.findIndex((oldTitle) =>
      isDuplicate(newItem.title, [oldTitle])
    );

    if (matchIdx !== -1) {
      // New item matches an old pending item — dismiss the old one
      await db
        .update(todoItems)
        .set({ status: "dismissed", updated_at: new Date() })
        .where(eq(todoItems.id, carryForwardRows[matchIdx].id));
    }

    await db.insert(todoItems).values({
      date: dateStr,
      title: newItem.title,
      is_urgent: newItem.is_urgent,
      status: "pending",
    });
  }

  // Move unmatched carry-forward items to today's date
  for (const row of carryForwardRows) {
    const wasMatched = newExtracted.some((newItem) =>
      isDuplicate(newItem.title, [row.title])
    );
    if (!wasMatched) {
      await db
        .update(todoItems)
        .set({ date: dateStr as unknown as string })
        .where(eq(todoItems.id, row.id));
    }
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
