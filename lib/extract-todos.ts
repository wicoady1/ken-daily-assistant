import OpenAI from "openai";

export interface ExtractedTodo {
  title: string;
  is_urgent: boolean;
}

export interface ExtractTodosResult {
  items: ExtractedTodo[];
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
        "You are a Tech Enabler personal assistant at a quick commerce company (similar to Astro Indonesia — on-demand grocery delivery in 15-30 minutes).",
        "Your job is to extract actionable to-do items from daily notes.",
        "",
        "Rules:",
        "- Extract ONLY discrete, actionable tasks. Do NOT include vague observations or general comments.",
        "- Each item must be phrased as an action (e.g., \"Fix payment gateway timeout\", \"Review inventory dashboard\").",
        "- Mark is_urgent: true ONLY for genuine critical items that need immediate attention TODAY.",
        "  Examples of urgent: system outage, payment failure, delivery blocker, supplier issue halting ops.",
        "  Do NOT mark non-urgent items as urgent. Be selective — urgency should be rare.",
        "- Understand quick commerce context: dark stores, micro-fulfillment, last-mile delivery, inventory turnover,",
        "  supplier reliability, system uptime, rider management, pricing, promotions.",
        "- Return ONLY valid JSON, no other text.",
        "",
        "Response format:",
        '{',
        '  "items": [',
        '    { "title": "Fix payment gateway timeout", "is_urgent": true },',
        '    { "title": "Review weekly inventory report", "is_urgent": false }',
        "  ]",
        "}",
      ].join("\n"),
    },
    {
      role: "user",
      content: `Here are my notes from yesterday. Extract the to-do items:\n\n${rawText}`,
    },
  ];
}

function parseResponse(content: string | null): ExtractedTodo[] {
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
    if (parsed.items && Array.isArray(parsed.items)) {
      return parsed.items.map(
        (item: { title?: string; is_urgent?: boolean }): ExtractedTodo => ({
          title: typeof item.title === "string" ? item.title : "",
          is_urgent: typeof item.is_urgent === "boolean" ? item.is_urgent : false,
        })
      ).filter((item: ExtractedTodo) => item.title.length > 0);
    }
  } catch {
    // fallback: line-by-line parsing
  }

  const lines = cleaned.split("\n").filter((l) => l.trim());
  const items: ExtractedTodo[] = [];
  for (const line of lines) {
    const cleanedLine = line.replace(/^[\s*•\-.\d]+/, "").trim();
    if (cleanedLine.length > 0) {
      const lower = cleanedLine.toLowerCase();
      const isUrgent = lower.includes("urgent") || lower.includes("asap") || lower.includes("critical");
      items.push({ title: cleanedLine, is_urgent: isUrgent });
    }
  }

  return items;
}

export async function extractTodos(rawText: string): Promise<ExtractedTodo[]> {
  if (!rawText || rawText.trim().length === 0) {
    return [];
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
      `LLM to-do extraction tokens: ${completion.usage.prompt_tokens} prompt + ${completion.usage.completion_tokens} completion = ${completion.usage.total_tokens} total`
    );
  }

  return parseResponse(content);
}
