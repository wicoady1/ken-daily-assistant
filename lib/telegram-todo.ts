import { type TodoItem } from "./todo-service";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

interface TelegramButton {
  text: string;
  callback_data: string;
}

interface InlineKeyboardMarkup {
  inline_keyboard: TelegramButton[][];
}

interface TodoPayload {
  text: string;
  parse_mode: "HTML";
  reply_markup: InlineKeyboardMarkup;
}

const MAX_MESSAGE_LENGTH = 4000;

interface FormattedTodo {
  text: string;
  shownIds: number[]; // IDs of items actually displayed
}

export function formatTodoMessage(items: TodoItem[], dateLabel: string): FormattedTodo {
  const parts: string[] = [];
  const shownIds: number[] = [];

  parts.push(`<b>✅ Daily To-Do — ${escapeHtml(dateLabel)}</b>`);

  const pending = items.filter((i) => i.status === "pending");
  const done = items.filter((i) => i.status === "done");

  const pendingUrgent = pending.filter((i) => i.is_urgent);
  const pendingNormal = pending.filter((i) => !i.is_urgent);

  let num = 1;
  let truncated = false;

  const append = (section: TodoItem[]) => {
    for (const item of section) {
      const line = `${num}. ${escapeHtml(item.title)}`;
      const candidate = parts.join("\n") + "\n" + line;
      if (candidate.length > MAX_MESSAGE_LENGTH) {
        truncated = true;
        return;
      }
      parts.push(line);
      shownIds.push(item.id);
      num++;
    }
  };

  if (pendingUrgent.length > 0) {
    parts.push("");
    parts.push("<b>🔴 URGENT</b>");
    append(pendingUrgent);
  }

  if (!truncated && pendingNormal.length > 0) {
    parts.push("");
    parts.push("<b>📋 Tasks</b>");
    append(pendingNormal);
  }

  if (!truncated && done.length > 0) {
    parts.push("");
    done.forEach((item) => {
      const line = `✓ <s>${escapeHtml(item.title)}</s>`;
      if ((parts.join("\n") + "\n" + line).length > MAX_MESSAGE_LENGTH) {
        truncated = true;
        return;
      }
      parts.push(line);
    });
  }

  if (truncated) {
    const remaining = pending.length - shownIds.length;
    if (remaining > 0) {
      parts.push("");
      parts.push(`<i>... truncated (${remaining} more items)</i>`);
    }
  }

  if (pending.length === 0 && done.length === 0) {
    parts.push("");
    parts.push("No pending tasks. 🎉");
  }

  parts.push("");
  parts.push(`<i>To-do from: ${escapeHtml(dateLabel)}</i>`);

  return { text: parts.join("\n"), shownIds };
}

export function buildInlineKeyboard(items: TodoItem[], shownIds: number[]): InlineKeyboardMarkup {
  const pending = items.filter((i) => i.status === "pending" && shownIds.includes(i.id));
  return {
    inline_keyboard: pending.map((item, index) => [
      { text: `✓ #${index + 1} Done`, callback_data: `todo:${item.id}:done` },
      { text: `✕ #${index + 1} Dismiss`, callback_data: `todo:${item.id}:dismiss` },
    ]),
  };
}

async function sendTelegram(
  token: string,
  chatId: string,
  payload: TodoPayload
): Promise<Response> {
  return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: payload.text,
      parse_mode: payload.parse_mode,
      reply_markup: payload.reply_markup,
    }),
  });
}

export async function editTodoMessage(
  chatId: string | number,
  messageId: number,
  items: TodoItem[],
  dateLabel: string,
  token: string
): Promise<void> {
  const formatted = formatTodoMessage(items, dateLabel);
  const reply_markup = buildInlineKeyboard(items, formatted.shownIds);

  const res = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: formatted.text,
      parse_mode: "HTML",
      reply_markup,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(`editMessageText failed: ${res.status} ${JSON.stringify(body)}`);
    throw new Error(
      `Telegram editMessageText error: ${res.status} ${JSON.stringify(body)}`
    );
  }

  console.log(`Todo message edited: ${messageId} (${items.length} items)`);
}

export async function sendTodoList(
  items: TodoItem[],
  dateLabel?: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN environment variable is not set");
  }

  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    throw new Error("TELEGRAM_CHAT_ID environment variable is not set");
  }

  const label =
    dateLabel ?? new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const formatted = formatTodoMessage(items, label);
  const reply_markup = buildInlineKeyboard(items, formatted.shownIds);
  const payload: TodoPayload = { text: formatted.text, parse_mode: "HTML", reply_markup };

  const res = await sendTelegram(token, chatId, payload);

  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    const retryAfter = (body as { parameters?: { retry_after?: number } }).parameters?.retry_after ?? 5;
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    const retryRes = await sendTelegram(token, chatId, payload);
    if (!retryRes.ok) {
      const retryBody = await retryRes.json().catch(() => ({}));
      throw new Error(
        `Telegram API error after retry: ${retryRes.status} ${JSON.stringify(retryBody)}`
      );
    }
    console.log(`Todo list sent (after rate-limit retry): ${label}`);
    return;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      `Telegram API error: ${res.status} ${JSON.stringify(body)}`
    );
  }

  console.log(`Todo list sent: ${label}`);
}
