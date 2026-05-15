import OpenAI from "openai";

export interface SummaryResult {
  followUpToday: string[];
  prepareAhead: string[];
  raw: string;
}

function getClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY environment variable is not set");
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
    timeout: 30000,
    maxRetries: 0,
  });
}

function buildPrompt(rawText: string): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return [
    {
      role: "system",
      content: [
        "You are a productivity assistant that turns daily notes into prioritized to-do lists.",
        "Analyze the notes and categorize items into two groups:",
        "",
        "1. followUpToday: Items that are URGENT or IMPORTANT and need attention TODAY.",
        "   These include deadlines, time-sensitive tasks, client follow-ups, meetings.",
        "",
        "2. prepareAhead: Items that should be prepared or planned for FUTURE days.",
        "   These include upcoming events, long-term tasks, research, non-urgent prep work.",
        "",
        "Rules:",
        "- Return ONLY valid JSON, no other text.",
        '- Each item should be a concise action-oriented string (max 100 chars).',
        "- If a group has no items, return an empty array.",
        "- Keep the original raw text in the 'raw' field for reference.",
        "",
        "Response format:",
        '{',
        '  "followUpToday": ["item 1", "item 2"],',
        '  "prepareAhead": ["item 1", "item 2"],',
        '  "raw": "original notes text"',
        "}",
      ].join("\n"),
    },
    {
      role: "user",
      content: `Here are my notes from yesterday. Please categorize them:\n\n${rawText}`,
    },
  ];
}

function parseResponse(
  content: string | null
): Pick<SummaryResult, "followUpToday" | "prepareAhead"> {
  if (!content) {
    throw new Error("Empty response from LLM");
  }

  let cleaned = content.trim();

  if (cleaned.startsWith("```")) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      cleaned = match[1].trim();
    }
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      followUpToday: Array.isArray(parsed.followUpToday) ? parsed.followUpToday : [],
      prepareAhead: Array.isArray(parsed.prepareAhead) ? parsed.prepareAhead : [],
    };
  } catch {
    const lines = cleaned.split("\n").filter((l) => l.trim());
    const followUpToday: string[] = [];
    const prepareAhead: string[] = [];
    let currentSection: "followUpToday" | "prepareAhead" | null = null;

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes("follow") || lower.includes("urgent") || lower.includes("today")) {
        currentSection = "followUpToday";
        continue;
      }
      if (lower.includes("prepare") || lower.includes("future") || lower.includes("ahead")) {
        currentSection = "prepareAhead";
        continue;
      }
      if (currentSection && /^\s*(?:[-*\d.]\s*)?(.+)/.test(line)) {
        const item = line.replace(/^[\s*•\-.\d]+/, "").trim();
        if (item) {
          if (currentSection === "followUpToday") {
            followUpToday.push(item);
          } else {
            prepareAhead.push(item);
          }
        }
      }
    }

    return { followUpToday, prepareAhead };
  }
}

export async function summarizeNotes(rawText: string): Promise<SummaryResult> {
  if (!rawText || rawText.trim().length === 0) {
    return { followUpToday: [], prepareAhead: [], raw: rawText };
  }

  const client = getClient();
  const messages = buildPrompt(rawText);

  const completion = await client.chat.completions.create({
    model: "deepseek-chat",
    messages,
    temperature: 0.3,
  });

  const choice = completion.choices?.[0];
  const content = choice?.message?.content ?? null;

  if (completion.usage) {
    console.log(
      `LLM summarization tokens: ${completion.usage.prompt_tokens} prompt + ${completion.usage.completion_tokens} completion = ${completion.usage.total_tokens} total`
    );
  }

  const categorized = parseResponse(content);

  return {
    ...categorized,
    raw: rawText,
  };
}
