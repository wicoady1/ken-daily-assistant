interface ReminderSection {
  followUpToday: string[];
  prepareAhead: string[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatReminder(
  message: ReminderSection,
  dateLabel: string
): string {
  const parts: string[] = [];

  parts.push(`<b>📋 Follow Up Today</b>`);
  if (message.followUpToday.length === 0) {
    parts.push("(none)");
  } else {
    message.followUpToday.forEach((item, i) => {
      parts.push(`${i + 1}. ${escapeHtml(item)}`);
    });
  }

  parts.push("");
  parts.push(`<b>🔮 Prepare Ahead</b>`);
  if (message.prepareAhead.length === 0) {
    parts.push("(none)");
  } else {
    message.prepareAhead.forEach((item, i) => {
      parts.push(`${i + 1}. ${escapeHtml(item)}`);
    });
  }

  parts.push("");
  parts.push(`<i>From yesterday's notes — ${escapeHtml(dateLabel)}</i>`);

  return parts.join("\n");
}

async function sendTelegram(
  token: string,
  chatId: string,
  text: string
): Promise<Response> {
  return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
}

export async function sendDailyReminder(
  message: ReminderSection,
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
  const text = formatReminder(message, label);

  const res = await sendTelegram(token, chatId, text);

  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    const retryAfter = (body as { parameters?: { retry_after?: number } }).parameters?.retry_after ?? 5;
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    const retryRes = await sendTelegram(token, chatId, text);
    if (!retryRes.ok) {
      const retryBody = await retryRes.json().catch(() => ({}));
      throw new Error(
        `Telegram API error after retry: ${retryRes.status} ${JSON.stringify(retryBody)}`
      );
    }
    console.log(`Daily reminder sent (after rate-limit retry): ${label}`);
    return;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      `Telegram API error: ${res.status} ${JSON.stringify(body)}`
    );
  }

  console.log(`Daily reminder sent: ${label}`);
}
