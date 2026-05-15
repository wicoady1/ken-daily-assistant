import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSelect, mockValuesFn, mockSetFn } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockValuesFn: vi.fn(),
  mockSetFn: vi.fn(),
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

describe("GET /api/cron", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("CRON_SECRET", "test-secret-123");
    mockValuesFn.mockResolvedValue(undefined);
    mockSetFn.mockImplementation(() => ({
      where: () => Promise.resolve(undefined),
    }));
    mockSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    });
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
});
