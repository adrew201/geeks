import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY in backend .env");
  }
  if (!client) {
    client = new Anthropic({ apiKey });
  }
  return client;
}

// Model stays in env so you can swap without a code change.
// Falls back to the README default when unset.
export const claudeModel = process.env.CLAUDE_MODEL ?? "claude-sonnet-5-5";
export const claudeMaxTokens = Number(process.env.CLAUDE_MAX_TOKENS ?? 1500);

export async function askClaude(prompt: string): Promise<string> {
  const debug = process.env.DEBUG_AI === "true";
  if (debug) {
    console.log("--- PROMPT SENT TO CLAUDE ---");
    console.log(prompt);
  }
  const res = await getAnthropic().messages.create({
    model: claudeModel,
    max_tokens: claudeMaxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .filter(Boolean)
    .join("\n");
  if (debug) {
    console.log("--- RAW REPLY FROM CLAUDE ---");
    console.log(text);
  }
  return text;
}
