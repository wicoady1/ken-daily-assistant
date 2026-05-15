import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSelect, mockValuesFn, mockSetFn, mockGenerateTodoList, mockSendTodoList } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockValuesFn: vi.fn(),
  mockSetFn: vi.fn(),
  mockGenerateTodoList: vi.fn(),
  mockSendTodoList: vi.fn(),
}));

vi.mock("@/lib/wib-date", () => ({
  yesterdayWIB: vi.fn(() => "2026-05-14"),
}));

vi.mock("@/lib/summarize", () => ({
  summarizeNotes: vi.fn(),
}));

vi.mock("@/lib/telegram", () => ({
  sendDailyReminder: vi.fn(),
}));

vi.mock("@/lib/todo-service", () => ({
  generateTodoList: mockGenerateTodoList,
}));

vi.mock("@/lib/telegram-todo", () => ({
  sendTodoList: mockSendTodoList,
}));

vi.mock("@vercel/postgres", () => ({ sql: {} }));

vi.mock("@/db", () => ({
  db: {
    select: mockSelect,
    insert: () => ({ values: mockValuesFn }),
    update: () => ({ set: mockSetFn }),
  },
}));

function mockRequest(url: string, token?: string) {
  const req = new Request(url);
  const nextUrl = new URL(url);
  if (token) {
    (req as any).headers.set("authorization", `Bearer ${token}`);
  }
  return Object.assign(req, { nextUrl }) as any;
}

function setupDbChain(results: unknown[]) {
  mockSelect.mockReturnValue({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve(results),
        orderBy: () => Promise.resolve(results),
      }),
    }),
  });
}

describe("GET /api/cron", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("CRON_SECRET", "test-secret-123");
    mockValuesFn.mockResolvedValue(undefined);
    mockSetFn.mockImplementation(() => ({
      where: () => Promise.resolve(undefined),
    }));
    setupDbChain([]);
  });

  it("returns 401 without CRON_SECRET", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const { GET } = await import("./route");
    const response = await GET(mockRequest("http://localhost/api/cron"));
    expect(response.status).toBe(401);
  });

  it("returns 401 with wrong secret", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      mockRequest("http://localhost/api/cron", "wrong-secret")
    );
    expect(response.status).toBe(401);
  });

  it("accepts secret via Authorization header", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      mockRequest("http://localhost/api/cron", "test-secret-123")
    );
    expect(response.status).toBe(200);
  });

  it("accepts secret via ?secret= query param", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      mockRequest("http://localhost/api/cron?secret=test-secret-123")
    );
    expect(response.status).toBe(200);
  });

  it("returns no_notes when no notes for yesterday", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      mockRequest("http://localhost/api/cron", "test-secret-123")
    );
    const body = await response.json();
    expect(body.status).toBe("no_notes");
    expect(body.date).toBe("2026-05-14");
  });

  describe("todo integration", () => {
    beforeEach(() => {
      const note = { id: 1, date: "2026-05-14", content: "Test notes content" };
      setupDbChain([note]);
    });

    it("sends todos after summary when items exist", async () => {
      const { summarizeNotes } = await import("@/lib/summarize");
      (summarizeNotes as any).mockResolvedValue({
        followUpToday: ["Task 1"],
        prepareAhead: ["Task 2"],
        raw: "raw",
      });

      mockGenerateTodoList.mockResolvedValue([
        { id: 1, title: "Fix payment", is_urgent: true, date: "2026-05-14", status: "pending", created_at: new Date() },
      ]);
      mockSendTodoList.mockResolvedValue(undefined);

      const { GET } = await import("./route");
      const response = await GET(
        mockRequest("http://localhost/api/cron", "test-secret-123")
      );
      const body = await response.json();

      expect(body.status).toBe("sent");
      expect(mockGenerateTodoList).toHaveBeenCalledWith("Test notes content", "2026-05-14");
      expect(mockSendTodoList).toHaveBeenCalledTimes(1);
      expect(body.todoCount).toBe(1);
    });

    it("skips todo delivery when no items extracted", async () => {
      const { summarizeNotes } = await import("@/lib/summarize");
      (summarizeNotes as any).mockResolvedValue({
        followUpToday: ["Task 1"],
        prepareAhead: [],
        raw: "raw",
      });

      mockGenerateTodoList.mockResolvedValue([]);

      const { GET } = await import("./route");
      const response = await GET(
        mockRequest("http://localhost/api/cron", "test-secret-123")
      );
      const body = await response.json();

      expect(body.status).toBe("sent");
      expect(mockSendTodoList).not.toHaveBeenCalled();
      expect(body.todoCount).toBe(0);
    });

    it("handles LLM extraction failure gracefully", async () => {
      const { summarizeNotes } = await import("@/lib/summarize");
      (summarizeNotes as any).mockResolvedValue({
        followUpToday: ["Task 1"],
        prepareAhead: [],
        raw: "raw",
      });

      mockGenerateTodoList.mockRejectedValue(new Error("LLM failed"));

      const { GET } = await import("./route");
      const response = await GET(
        mockRequest("http://localhost/api/cron", "test-secret-123")
      );
      const body = await response.json();

      expect(body.status).toBe("sent");
      expect(mockSendTodoList).not.toHaveBeenCalled();
      expect(body.todoCount).toBe(-1);
    });

    it("still sends todos in fallback path", async () => {
      const { summarizeNotes } = await import("@/lib/summarize");
      (summarizeNotes as any).mockRejectedValue(new Error("Summary failed"));

      mockGenerateTodoList.mockResolvedValue([
        { id: 1, title: "Fix urgent bug", is_urgent: true, date: "2026-05-14", status: "pending", created_at: new Date() },
      ]);
      mockSendTodoList.mockResolvedValue(undefined);

      const { GET } = await import("./route");
      const response = await GET(
        mockRequest("http://localhost/api/cron", "test-secret-123")
      );
      const body = await response.json();

      expect(body.status).toBe("fallback_sent");
      expect(mockGenerateTodoList).toHaveBeenCalledWith("Test notes content", "2026-05-14");
      expect(mockSendTodoList).toHaveBeenCalledTimes(1);
      expect(body.todoCount).toBe(1);
    });
  });
});
