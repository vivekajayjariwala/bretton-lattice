import Anthropic from "@anthropic-ai/sdk";

/** Shared Anthropic client + helpers for the three pipeline stages. */

export const MODEL = "claude-sonnet-5";

let client: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing ANTHROPIC_API_KEY. Add it to .env.local before running the pipeline.",
      );
    }
    client = new Anthropic({ apiKey, maxRetries: 4 });
  }
  return client;
}

export type TokenUsage = { input: number; output: number };

export function emptyUsage(): TokenUsage {
  return { input: 0, output: 0 };
}

export function addUsage(into: TokenUsage, usage: Anthropic.Usage): void {
  into.input += usage.input_tokens ?? 0;
  into.output += usage.output_tokens ?? 0;
}

/**
 * Calls Claude with a single tool and returns the tool input, which gives us a
 * schema-validated object rather than parsing JSON out of prose.
 */
export async function callStructured<T>({
  system,
  prompt,
  tool,
  maxTokens = 4096,
  usage,
}: {
  system: string;
  prompt: string;
  tool: Anthropic.Tool;
  maxTokens?: number;
  usage?: TokenUsage;
}): Promise<T> {
  const response = await getClaude().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
    messages: [{ role: "user", content: prompt }],
  });

  if (usage) addUsage(usage, response.usage);

  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error(
      `Expected a ${tool.name} tool call, got: ${response.stop_reason}`,
    );
  }
  return block.input as T;
}

/** Runs tasks with a concurrency cap so we don't hammer the API. */
export async function mapWithConcurrency<In, Out>(
  items: In[],
  limit: number,
  fn: (item: In, index: number) => Promise<Out>,
): Promise<Out[]> {
  const results = new Array<Out>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}
