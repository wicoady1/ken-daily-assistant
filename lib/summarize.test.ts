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

describe("summarizeNotes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    vi.stubEnv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1");
  });

  it("returns empty result for empty input", async () => {
    const { summarizeNotes } = await import("./summarize");
    const result = await summarizeNotes("");
    expect(result.followUpToday).toEqual([]);
    expect(result.prepareAhead).toEqual([]);
    expect(result.raw).toBe("");
  });

  it("returns empty result for whitespace-only input", async () => {
    const { summarizeNotes } = await import("./summarize");
    const result = await summarizeNotes("   \n  ");
    expect(result.followUpToday).toEqual([]);
    expect(result.prepareAhead).toEqual([]);
  });

  it("throws when DEEPSEEK_API_KEY is not set", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    const { summarizeNotes } = await import("./summarize");
    await expect(summarizeNotes("some notes")).rejects.toThrow("DEEPSEEK_API_KEY");
  });

  it("parses valid JSON response from LLM", async () => {
    const openaiModule = await import("openai");
    const mockCreate = (openaiModule as any).__mockCreate;

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              followUpToday: ["Call client", "Submit report"],
              prepareAhead: ["Book meeting", "Research topic"],
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

    const { summarizeNotes } = await import("./summarize");
    const result = await summarizeNotes("Meeting with client at 3pm. Need to submit Q2 report. Also book team meeting for next week.");

    expect(result.followUpToday).toEqual(["Call client", "Submit report"]);
    expect(result.prepareAhead).toEqual(["Book meeting", "Research topic"]);
  });

  it("parses JSON inside markdown code blocks", async () => {
    const openaiModule = await import("openai");
    const mockCreate = (openaiModule as any).__mockCreate;

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: "```json\n{\n  \"followUpToday\": [\"Fix bug\"],\n  \"prepareAhead\": []\n}\n```",
          },
        },
      ],
      usage: null,
    });

    const { summarizeNotes } = await import("./summarize");
    const result = await summarizeNotes("Fix the login bug urgently.");

    expect(result.followUpToday).toEqual(["Fix bug"]);
    expect(result.prepareAhead).toEqual([]);
  });

  it("falls back to line parsing when JSON is malformed", async () => {
    const openaiModule = await import("openai");
    const mockCreate = (openaiModule as any).__mockCreate;

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: "Follow up today:\n- Call vendor\n- Approve design\n\nPrepare ahead:\n- Review contract",
          },
        },
      ],
      usage: null,
    });

    const { summarizeNotes } = await import("./summarize");
    const result = await summarizeNotes("Call vendor about pricing. Approve new design.");

    expect(result.followUpToday.length).toBeGreaterThanOrEqual(1);
    expect(result.prepareAhead.length).toBeGreaterThanOrEqual(1);
  });

  it("handles API errors", async () => {
    const openaiModule = await import("openai");
    const mockCreate = (openaiModule as any).__mockCreate;

    mockCreate.mockRejectedValue(new Error("API rate limit exceeded"));

    const { summarizeNotes } = await import("./summarize");
    await expect(summarizeNotes("some notes")).rejects.toThrow("API rate limit exceeded");
  });

  it("handles null content from LLM", async () => {
    const openaiModule = await import("openai");
    const mockCreate = (openaiModule as any).__mockCreate;

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
      usage: null,
    });

    const { summarizeNotes } = await import("./summarize");
    await expect(summarizeNotes("test")).rejects.toThrow("Empty response");
  });

  it("handles empty choices array", async () => {
    const openaiModule = await import("openai");
    const mockCreate = (openaiModule as any).__mockCreate;

    mockCreate.mockResolvedValue({
      choices: [],
      usage: null,
    });

    const { summarizeNotes } = await import("./summarize");
    await expect(summarizeNotes("test")).rejects.toThrow("Empty response");
  });
});

describe("parseResponse", () => {
  it("parses JSON with empty arrays", async () => {
    const { summarizeNotes } = await import("./summarize");

    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    const openaiModule = await import("openai");
    const mockCreate = (openaiModule as any).__mockCreate;

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              followUpToday: [],
              prepareAhead: [],
            }),
          },
        },
      ],
      usage: null,
    });

    const result = await summarizeNotes("Just a regular day.");
    expect(result.followUpToday).toEqual([]);
    expect(result.prepareAhead).toEqual([]);
  });
});
