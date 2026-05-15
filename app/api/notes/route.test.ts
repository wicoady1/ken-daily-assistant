import { describe, it, expect, vi, beforeEach } from "vitest";
import { todayWIB, yesterdayWIB, isValidDate } from "@/lib/wib-date";

vi.mock("@vercel/postgres", () => ({
  sql: {},
}));

const mockSelectChain = () => ({
  from: () => ({
    where: () => ({
      limit: () => Promise.resolve([]),
    }),
  }),
});

const mockInsertChain = () => ({
  values: () => ({
    onConflictDoUpdate: () => ({
      returning: () => Promise.resolve([{ id: 1, date: "2026-05-14", content: "test" }]),
    }),
  }),
});

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => mockSelectChain()),
    insert: vi.fn(() => mockInsertChain()),
  },
}));

describe("wib-date", () => {
  it("todayWIB returns YYYY-MM-DD format", () => {
    const result = todayWIB();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("yesterdayWIB returns YYYY-MM-DD format", () => {
    const result = yesterdayWIB();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("yesterdayWIB differs from todayWIB", () => {
    expect(yesterdayWIB()).not.toBe(todayWIB());
  });

  it("isValidDate validates correct dates", () => {
    expect(isValidDate("2026-05-14")).toBe(true);
    expect(isValidDate("2026-01-01")).toBe(true);
  });

  it("isValidDate rejects invalid formats", () => {
    expect(isValidDate("2026/05/14")).toBe(false);
    expect(isValidDate("14-05-2026")).toBe(false);
    expect(isValidDate("not-a-date")).toBe(false);
    expect(isValidDate("2026-5-14")).toBe(false);
    expect(isValidDate("")).toBe(false);
  });
});

function mockRequest(url: string) {
  const req = new Request(url);
  const nextUrl = new URL(url);
  return Object.assign(req, { nextUrl }) as any;
}

function mockPostRequest(url: string, body: any) {
  const req = new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const nextUrl = new URL(url);
  return Object.assign(req, { nextUrl }) as any;
}

describe("GET /api/notes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("defaults to today when no date param", async () => {
    const { GET } = await import("./route");
    const response = await GET(mockRequest("http://localhost/api/notes"));
    expect(response.status).toBe(404);
  });

  it("returns 400 for invalid date format", async () => {
    const { GET } = await import("./route");
    const response = await GET(mockRequest("http://localhost/api/notes?date=invalid"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid date format");
  });

  it("returns 500 when db throws", async () => {
    const { db } = await import("@/db");
    (db.select as any).mockImplementation(() => {
      throw new Error("DB connection failed");
    });
    const { GET } = await import("./route");
    const response = await GET(mockRequest("http://localhost/api/notes?date=2026-05-14"));
    expect(response.status).toBe(500);
  });
});

describe("POST /api/notes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 400 when date is missing", async () => {
    const { POST } = await import("./route");
    const response = await POST(mockPostRequest("http://localhost/api/notes", { content: "test" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when content is missing", async () => {
    const { POST } = await import("./route");
    const response = await POST(mockPostRequest("http://localhost/api/notes", { date: "2026-05-14" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid date format", async () => {
    const { POST } = await import("./route");
    const response = await POST(mockPostRequest("http://localhost/api/notes", { date: "14-05-2026", content: "test" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for content exceeding 10000 chars", async () => {
    const { POST } = await import("./route");
    const longContent = "a".repeat(10001);
    const response = await POST(mockPostRequest("http://localhost/api/notes", { date: "2026-05-14", content: longContent }));
    expect(response.status).toBe(400);
  });

  it("returns 500 when db throws on insert", async () => {
    const { db } = await import("@/db");
    (db.insert as any).mockImplementation(() => {
      throw new Error("DB write failed");
    });
    const { POST } = await import("./route");
    const response = await POST(mockPostRequest("http://localhost/api/notes", { date: "2026-05-14", content: "hello" }));
    expect(response.status).toBe(500);
  });
});
