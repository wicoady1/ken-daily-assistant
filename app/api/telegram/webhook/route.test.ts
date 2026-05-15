import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockSet = vi.fn();
const mockFrom = vi.fn();

vi.mock("@vercel/postgres", () => ({ sql: {} }));
vi.mock("@/db", () => ({
  db: {
    select: mockSelect,
    update: () => ({
      set: mockSet,
    }),
  },
}));

function setupUpdateSuccess() {
  mockSet.mockReturnValue({ where: () => Promise.resolve(undefined) });
}

function setupSelectReturn(result: unknown[]) {
  mockOrderBy.mockImplementation(() =>
    Promise.resolve(result)
  );
  mockLimit.mockImplementation(() =>
    Promise.resolve(result)
  );
  mockWhere.mockImplementation(() => ({
    limit: mockLimit,
    orderBy: mockOrderBy,
  }));
  mockFrom.mockReturnValue({ where: mockWhere });
  mockSelect.mockReturnValue({ from: mockFrom });
}

function mockRequest(body: unknown) {
  const req = new Request("http://localhost/api/telegram/webhook", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
  return Object.assign(req, { nextUrl: new URL("http://localhost/api/telegram/webhook") });
}

function makeCallbackQuery(overrides: Partial<{ data: string; id: string }>) {
  return {
    callback_query: {
      id: "cq-123",
      data: "todo:1:done",
      message: { chat: { id: 12345 }, message_id: 99 },
      ...overrides,
    },
  };
}

describe("POST /api/telegram/webhook", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test:token");
    setupUpdateSuccess();
  });

  it("returns 200 when no callback_query", async () => {
    const { POST } = await import("./route");
    const response = await POST(mockRequest({ message: { text: "hello" } }));
    expect(response.status).toBe(200);
  });

  it("processes done action, edits message, and answers callback", async () => {
    setupSelectReturn([{ id: 1, date: "2026-05-14", title: "Fix gateway", is_urgent: true, status: "done", created_at: new Date() }]);

    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const { POST } = await import("./route");
    const response = await POST(mockRequest(makeCallbackQuery({ data: "todo:1:done" })));

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    expect(mockFetch.mock.calls[0][0]).toContain("editMessageText");
    expect(mockFetch.mock.calls[1][0]).toContain("answerCallbackQuery");
  });

  it("processes dismiss action, edits message, and answers callback", async () => {
    setupSelectReturn([{ id: 2, date: "2026-05-14", title: "Some task", is_urgent: false, status: "dismissed", created_at: new Date() }]);

    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const { POST } = await import("./route");
    const response = await POST(mockRequest(makeCallbackQuery({ data: "todo:2:dismiss" })));

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1][0]).toContain("answerCallbackQuery");
    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body.text).toContain("Dismissed");
  });

  it("handles invalid callback data", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const { POST } = await import("./route");
    const response = await POST(mockRequest(makeCallbackQuery({ data: "invalid-format" })));

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.text).toBe("Invalid action");
  });

  it("handles errors gracefully", async () => {
    setupSelectReturn([{ id: 1, date: "2026-05-14", title: "Fix gateway", is_urgent: true, status: "done", created_at: new Date() }]);

    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    const { POST } = await import("./route");
    const response = await POST(mockRequest(makeCallbackQuery({})));

    expect(response.status).toBe(200);
  });

  it("returns 200 when TELEGRAM_BOT_TOKEN is not set", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");

    const { POST } = await import("./route");
    const response = await POST(mockRequest({}));

    expect(response.status).toBe(200);
  });
});
