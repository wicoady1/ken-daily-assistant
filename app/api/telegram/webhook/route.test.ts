import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@vercel/postgres", () => ({ sql: {} }));
vi.mock("@/db", () => ({
  db: {
    update: () => ({
      set: () => ({
        where: () => Promise.resolve(undefined),
      }),
    }),
  },
}));

function mockRequest(body: unknown, token?: string) {
  const req = new Request("http://localhost/api/telegram/webhook", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
  return Object.assign(req, { nextUrl: new URL("http://localhost/api/telegram/webhook") }) as any;
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
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test:token");
  });

  it("returns 200 when no callback_query", async () => {
    const { POST } = await import("./route");
    const response = await POST(mockRequest({ message: { text: "hello" } }));
    expect(response.status).toBe(200);
  });

  it("processes done action and answers callback", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const { POST } = await import("./route");
    const response = await POST(mockRequest(makeCallbackQuery({ data: "todo:1:done" })));

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callUrl = mockFetch.mock.calls[0][0];
    expect(callUrl).toContain("answerCallbackQuery");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.text).toContain("done");
  });

  it("processes dismiss action and answers callback", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const { POST } = await import("./route");
    const response = await POST(mockRequest(makeCallbackQuery({ data: "todo:2:dismiss" })));

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
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
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

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
