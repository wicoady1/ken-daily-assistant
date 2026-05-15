import { NextRequest, NextResponse } from "next/server";
import { markDone, markDismissed } from "@/lib/todo-service";

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

    if (action === "done") {
      await markDone(id);
      await answerCallbackQuery(token, callbackQuery.id, "✅ Marked as done");
    } else if (action === "dismiss") {
      await markDismissed(id);
      await answerCallbackQuery(token, callbackQuery.id, "✕ Dismissed");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}
