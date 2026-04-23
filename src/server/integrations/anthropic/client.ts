import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

let _client: Anthropic | null = null;

/** Lazily instantiate the Anthropic client so build doesn't fail without a key. */
export function getAnthropicClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is required to use the Anthropic client");
  }
  if (!_client) {
    _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// Claude Sonnet 4.6 pricing (USD per 1M tokens, as of Oct 2025)
// https://www.anthropic.com/pricing
export const CLAUDE_SONNET_PRICING = {
  inputPerMillion: 3,
  outputPerMillion: 15,
} as const;

// Anthropic web search: $10 / 1000 requests → 1 cent per request.
export const WEB_SEARCH_COST_CENTS_PER_REQUEST = 1;

export function estimateCostCents(
  tokensIn: number,
  tokensOut: number,
  webSearchRequests = 0,
) {
  const dollars =
    (tokensIn * CLAUDE_SONNET_PRICING.inputPerMillion +
      tokensOut * CLAUDE_SONNET_PRICING.outputPerMillion) /
    1_000_000;
  return (
    Math.ceil(dollars * 100) +
    webSearchRequests * WEB_SEARCH_COST_CENTS_PER_REQUEST
  );
}
