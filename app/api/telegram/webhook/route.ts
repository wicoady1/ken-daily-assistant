import { NextRequest, NextResponse } from "next/server";
import { markDone, markDismissed, getTodoItem, getAllTodosForDate } from "@/lib/todo-service";
import { editTodoMessage } from "@/lib/telegram-todo";

interface CallbackData {
  id: number;
  action: "done" | "dismiss";
}

function parseCallbackData(data: string): CallbackData | null {
  const match = data.match(/^todo:(\d+):(done|dismiss)$/);
  if (!match) return null;
  return { id: Number(match[1]), action: match[2] as CallbackData["action"] };
}

async function answerCallbackQuery(
  token: string,
  callbackQueryId: string,
  text: string
): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
    }),
  });
}

async function reloadTodoMessage(
  token: string,
  chatId: number,
  messageId: number,
  itemId: number
): Promise<void> {
  const updatedItem = await getTodoItem(itemId);
  if (!updatedItem) {
    console.error("reloadTodoMessage: item not found", itemId);
    return;
  }
  const allItems = await getAllTodosForDate(updatedItem.date);
  await editTodoMessage(chatId, messageId, allItems, updatedItem.date, token);
}

export async function POST(request: NextRequest) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error("TELEGRAM_BOT_TOKEN not set");
      return NextResponse.json({ ok: true });
    }

    const update = await request.json();
    const callbackQuery = update?.callback_query;
    if (!callbackQuery) {
      return NextResponse.json({ ok: true });
    }

    const parsed = parseCallbackData(callbackQuery.data);
    if (!parsed) {
      await answerCallbackQuery(token, callbackQuery.id, "Invalid action");
      return NextResponse.json({ ok: true });
    }

    const { id, action } = parsed;
    const chatId = callbackQuery.message?.chat?.id;
    const messageId = callbackQuery.message?.message_id;

    if (action === "done") {
      await markDone(id);
      if (chatId && messageId) {
        try {
          await reloadTodoMessage(token, chatId, messageId, id);
        } catch (err) {
          console.error("reloadTodoMessage failed:", err);
        }
      }
      await answerCallbackQuery(token, callbackQuery.id, "✅ Marked as done");
    } else if (action === "dismiss") {
      await markDismissed(id);
      if (chatId && messageId) {
        try {
          await reloadTodoMessage(token, chatId, messageId, id);
        } catch (err) {
          console.error("reloadTodoMessage failed:", err);
        }
      }
      await answerCallbackQuery(token, callbackQuery.id, "✕ Dismissed");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}
