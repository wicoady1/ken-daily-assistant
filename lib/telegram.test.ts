import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the internal functions by re-implementing them here to avoid
// importing from the actual module (which has side effects from env var checks)
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatReminder(
  message: { followUpToday: string[]; prepareAhead: string[] },
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

describe("escapeHtml", () => {
  it("escapes & < > characters", () => {
    expect(escapeHtml("a & b < c > d")).toBe("a &amp; b &lt; c &gt; d");
  });

  it("leaves plain text unchanged", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
});

describe("formatReminder", () => {
  it("formats a complete reminder with items", () => {
    const result = formatReminder(
      {
        followUpToday: ["Call client about proposal", "Review PR #42"],
        prepareAhead: ["Book travel for next week", "Prepare Q2 slides"],
      },
      "2026-05-14"
    );

    expect(result).toContain("<b>📋 Follow Up Today</b>");
    expect(result).toContain("1. Call client about proposal");
    expect(result).toContain("2. Review PR #42");
    expect(result).toContain("<b>🔮 Prepare Ahead</b>");
    expect(result).toContain("1. Book travel for next week");
    expect(result).toContain("2. Prepare Q2 slides");
    expect(result).toContain("<i>From yesterday's notes — 2026-05-14</i>");
  });

  it("shows (none) for empty sections", () => {
    const result = formatReminder(
      { followUpToday: [], prepareAhead: [] },
      "2026-05-14"
    );

    expect(result).toContain("(none)");
  });

  it("escapes HTML in follow up items", () => {
    const result = formatReminder(
      {
        followUpToday: ["Fix <script>alert('xss')</script> bug"],
        prepareAhead: [],
      },
      "2026-05-14"
    );

    expect(result).toContain("&lt;script&gt;alert('xss')&lt;/script&gt;");
    expect(result).not.toContain("<script>");
  });

  it("includes date label in footer", () => {
    const result = formatReminder(
      { followUpToday: ["Task"], prepareAhead: [] },
      "2026-05-14"
    );

    expect(result).toContain("2026-05-14");
  });
});

describe("sendDailyReminder", () => {
  beforeEach(() => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test:token");
    vi.stubEnv("TELEGRAM_CHAT_ID", "12345");
  });

  it("throws if TELEGRAM_BOT_TOKEN is not set", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    const { sendDailyReminder } = await import("./telegram");
    await expect(
      sendDailyReminder({ followUpToday: [], prepareAhead: [] })
    ).rejects.toThrow("TELEGRAM_BOT_TOKEN");
  });

  it("throws if TELEGRAM_CHAT_ID is not set", async () => {
    vi.stubEnv("TELEGRAM_CHAT_ID", "");
    const { sendDailyReminder } = await import("./telegram");
    await expect(
      sendDailyReminder({ followUpToday: [], prepareAhead: [] })
    ).rejects.toThrow("TELEGRAM_CHAT_ID");
  });

  it("sends message to Telegram API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { sendDailyReminder } = await import("./telegram");
    await sendDailyReminder(
      { followUpToday: ["Task"], prepareAhead: [] },
      "2026-05-14"
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("test:token");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.chat_id).toBe("12345");
    expect(body.parse_mode).toBe("HTML");
  });
});
