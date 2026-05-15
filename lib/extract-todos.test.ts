import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
      constructor(_opts: Record<string, unknown>) {}
    },
    __mockCreate: mockCreate,
  };
});

describe("extractTodos", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    vi.stubEnv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1");
  });

  it("returns empty array for empty input", async () => {
    const { extractTodos } = await import("./extract-todos");
    const result = await extractTodos("");
    expect(result).toEqual([]);
  });

  it("returns empty array for whitespace-only input", async () => {
    const { extractTodos } = await import("./extract-todos");
    const result = await extractTodos("   \n  ");
    expect(result).toEqual([]);
  });

  it("throws when DEEPSEEK_API_KEY is not set", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    const { extractTodos } = await import("./extract-todos");
    await expect(extractTodos("some notes")).rejects.toThrow("DEEPSEEK_API_KEY");
  });

  it("parses valid JSON response from LLM", async () => {
    const openaiModule = await import("openai");
    const mockCreate = (openaiModule as any).__mockCreate;

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                { title: "Fix payment gateway timeout", is_urgent: true },
                { title: "Review inventory dashboard", is_urgent: false },
              ],
            }),
          },
        },
      ],
      usage: {
        prompt_tokens: 150,
        completion_tokens: 80,
        total_tokens: 230,
      },
    });

    const { extractTodos } = await import("./extract-todos");
    const result = await extractTodos("Payment gateway is timing out. Need to check inventory levels.");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ title: "Fix payment gateway timeout", is_urgent: true });
    expect(result[1]).toEqual({ title: "Review inventory dashboard", is_urgent: false });
  });

  it("parses JSON inside markdown code blocks", async () => {
    const openaiModule = await import("openai");
    const mockCreate = (openaiModule as any).__mockCreate;

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: '```json\n{\n  "items": [\n    { "title": "Fix login bug", "is_urgent": true }\n  ]\n}\n```',
          },
        },
      ],
      usage: null,
    });

    const { extractTodos } = await import("./extract-todos");
    const result = await extractTodos("Login bug is blocking users.");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ title: "Fix login bug", is_urgent: true });
  });

  it("falls back to line parsing when JSON is malformed", async () => {
    const openaiModule = await import("openai");
    const mockCreate = (openaiModule as any).__mockCreate;

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: "- Fix payment gateway (urgent)\n- Review inventory\n- Call supplier",
          },
        },
      ],
      usage: null,
    });

    const { extractTodos } = await import("./extract-todos");
    const result = await extractTodos("Payment gateway issue. Review inventory. Call supplier.");

    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.some((i: { title: string; is_urgent: boolean }) => i.title.toLowerCase().includes("payment"))).toBe(true);
  });

  it("handles API errors", async () => {
    const openaiModule = await import("openai");
    const mockCreate = (openaiModule as any).__mockCreate;

    mockCreate.mockRejectedValue(new Error("API rate limit exceeded"));

    const { extractTodos } = await import("./extract-todos");
    await expect(extractTodos("some notes")).rejects.toThrow("API rate limit exceeded");
  });

  it("handles null content from LLM", async () => {
    const openaiModule = await import("openai");
    const mockCreate = (openaiModule as any).__mockCreate;

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
      usage: null,
    });

    const { extractTodos } = await import("./extract-todos");
    await expect(extractTodos("test")).rejects.toThrow("Empty response");
  });

  it("handles empty choices array", async () => {
    const openaiModule = await import("openai");
    const mockCreate = (openaiModule as any).__mockCreate;

    mockCreate.mockResolvedValue({
      choices: [],
      usage: null,
    });

    const { extractTodos } = await import("./extract-todos");
    await expect(extractTodos("test")).rejects.toThrow("Empty response");
  });

  it("filters out items with empty titles", async () => {
    const openaiModule = await import("openai");
    const mockCreate = (openaiModule as any).__mockCreate;

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                { title: "", is_urgent: true },
                { title: "Valid task", is_urgent: false },
              ],
            }),
          },
        },
      ],
      usage: null,
    });

    const { extractTodos } = await import("./extract-todos");
    const result = await extractTodos("Some notes.");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ title: "Valid task", is_urgent: false });
  });
});
