import { describe, it, expect, vi, beforeEach } from "vitest";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function makeItem(overrides: Partial<{ id: number; title: string; is_urgent: boolean; date: string; status: string; created_at: Date }>) {
  return {
    id: 1,
    title: "Test task",
    is_urgent: false,
    date: "2026-05-14",
    status: "pending" as const,
    created_at: new Date(),
    ...overrides,
  };
}

describe("sendTodoList", () => {
  beforeEach(() => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test:token");
    vi.stubEnv("TELEGRAM_CHAT_ID", "12345");
  });

  it("throws if TELEGRAM_BOT_TOKEN is not set", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    const { sendTodoList } = await import("./telegram-todo");
    await expect(sendTodoList([])).rejects.toThrow("TELEGRAM_BOT_TOKEN");
  });

  it("throws if TELEGRAM_CHAT_ID is not set", async () => {
    vi.stubEnv("TELEGRAM_CHAT_ID", "");
    const { sendTodoList } = await import("./telegram-todo");
    await expect(sendTodoList([])).rejects.toThrow("TELEGRAM_CHAT_ID");
  });

  it("sends message with inline keyboard", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { sendTodoList } = await import("./telegram-todo");
    const items = [makeItem({ id: 1, title: "Fix payment gateway", is_urgent: true })];

    await sendTodoList(items, "2026-05-14");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.chat_id).toBe("12345");
    expect(body.parse_mode).toBe("HTML");
    expect(body.reply_markup).toBeDefined();
    expect(body.reply_markup.inline_keyboard).toHaveLength(1);
    expect(body.reply_markup.inline_keyboard[0][0].text).toBe("✓ #1 Done");
    expect(body.reply_markup.inline_keyboard[0][0].callback_data).toBe("todo:1:done");
    expect(body.reply_markup.inline_keyboard[0][1].text).toBe("✕ #1 Dismiss");
    expect(body.reply_markup.inline_keyboard[0][1].callback_data).toBe("todo:1:dismiss");
  });

  it("includes HTML formatted message with urgent and normal sections", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { sendTodoList } = await import("./telegram-todo");
    const items = [
      makeItem({ id: 1, title: "Fix payment gateway", is_urgent: true }),
      makeItem({ id: 2, title: "Review inventory", is_urgent: false }),
    ];

    await sendTodoList(items, "2026-05-14");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.text).toContain("<b>🔴 URGENT</b>");
    expect(body.text).toContain("<b>📋 Tasks</b>");
    expect(body.text).toContain("Fix payment gateway");
    expect(body.text).toContain("Review inventory");
    expect(body.text).toContain("2026-05-14");
  });

  it("sends friendly message when list is empty", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { sendTodoList } = await import("./telegram-todo");
    await sendTodoList([], "2026-05-14");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.text).toContain("No pending tasks");
    expect(body.reply_markup.inline_keyboard).toHaveLength(0);
  });

  it("escapes HTML in item titles", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { sendTodoList } = await import("./telegram-todo");
    const items = [makeItem({ id: 1, title: "Fix <script>alert('xss')</script>" })];

    await sendTodoList(items, "2026-05-14");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.text).toContain("&lt;script&gt;alert('xss')&lt;/script&gt;");
    expect(body.text).not.toContain("<script>");
  });

  it("handles rate limiting with retry", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        status: 429,
        ok: false,
        json: () => Promise.resolve({ ok: false, parameters: { retry_after: 0 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const { sendTodoList } = await import("./telegram-todo");
    await sendTodoList([makeItem({ id: 1 })], "2026-05-14");

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  describe("formatTodoMessage", () => {
    it("uses numbered list instead of bullets", async () => {
      const { formatTodoMessage } = await import("./telegram-todo");
      const items = [
        makeItem({ id: 1, title: "Fix gateway", is_urgent: true }),
        makeItem({ id: 2, title: "Review inventory", is_urgent: false }),
      ];
      const result = formatTodoMessage(items, "2026-05-14");
      expect(result).toContain("1. Fix gateway");
      expect(result).toContain("2. Review inventory");
      expect(result).not.toContain("•");
    });

    it("numbers items sequentially across sections", async () => {
      const { formatTodoMessage } = await import("./telegram-todo");
      const items = [
        makeItem({ id: 1, title: "Urgent task", is_urgent: true }),
        makeItem({ id: 2, title: "Normal task", is_urgent: false }),
        makeItem({ id: 3, title: "Another normal", is_urgent: false }),
      ];
      const result = formatTodoMessage(items, "2026-05-14");
      expect(result).toContain("1. Urgent task");
      expect(result).toContain("2. Normal task");
      expect(result).toContain("3. Another normal");
    });
  });

  describe("buildInlineKeyboard", () => {
    it("includes display number in button text", async () => {
      const { buildInlineKeyboard } = await import("./telegram-todo");
      const items = [
        makeItem({ id: 10, title: "First", is_urgent: false }),
        makeItem({ id: 20, title: "Second", is_urgent: false }),
      ];
      const keyboard = buildInlineKeyboard(items);

      expect(keyboard.inline_keyboard[0][0].text).toBe("✓ #1 Done");
      expect(keyboard.inline_keyboard[0][1].text).toBe("✕ #1 Dismiss");
      expect(keyboard.inline_keyboard[1][0].text).toBe("✓ #2 Done");
      expect(keyboard.inline_keyboard[1][1].text).toBe("✕ #2 Dismiss");
    });

    it("uses DB id in callback data regardless of display number", async () => {
      const { buildInlineKeyboard } = await import("./telegram-todo");
      const items = [
        makeItem({ id: 42, title: "Task", is_urgent: false }),
      ];
      const keyboard = buildInlineKeyboard(items);

      expect(keyboard.inline_keyboard[0][0].callback_data).toBe("todo:42:done");
      expect(keyboard.inline_keyboard[0][1].callback_data).toBe("todo:42:dismiss");
    });
  });
});
