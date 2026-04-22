import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

/**
 * Rate limiters for the lead magnet endpoint.
 *
 * Three tiers:
 *   1. IP (per hour) — blocks bots & scrapers from a single IP.
 *   2. Email (per 24h) — blocks "let me try different variations".
 *   3. Budget (cost cents per week) — hard-caps LLM spend app-wide.
 *
 * If Upstash creds are missing in dev, we return permissive no-op limiters
 * with a warning. In production the caller should fail hard.
 */

const hasRedis = !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

export const isRateLimitBacked = hasRedis;

const redis = hasRedis
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

function permissive() {
  return {
    limit: async () => ({ success: true, remaining: 999, reset: Date.now() + 60_000 }),
  };
}

export const leadMagnetIpLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        env.LEAD_MAGNET_RATE_LIMIT_PER_IP_HOUR ?? 5,
        "1 h",
      ),
      prefix: "rl:lead:ip",
      analytics: true,
    })
  : permissive();

export const leadMagnetEmailLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(
        env.LEAD_MAGNET_RATE_LIMIT_PER_EMAIL_DAY ?? 3,
        "24 h",
      ),
      prefix: "rl:lead:email",
      analytics: true,
    })
  : permissive();

const BUDGET_KEY = () => {
  // ISO week key YYYY-WW
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((now.getTime() - yearStart.getTime()) / 86400000 + yearStart.getUTCDay() + 1) / 7,
  );
  return `rl:lead:budget:${now.getUTCFullYear()}-${String(weekNum).padStart(2, "0")}`;
};

/**
 * Add spend in cents to the weekly budget counter.
 * Returns true if we are still under budget, false if we've exceeded it.
 */
export async function addBudgetSpend(cents: number): Promise<boolean> {
  if (!redis) return true;
  const key = BUDGET_KEY();
  const total = await redis.incrby(key, cents);
  // First time we set the key, give it a 10-day TTL to survive the week
  if (total === cents) {
    await redis.expire(key, 10 * 24 * 60 * 60);
  }
  const cap = env.ANTHROPIC_MAX_COST_CENTS_PER_WEEK ?? 5000;
  return total <= cap;
}

export async function getWeeklySpendCents(): Promise<number> {
  if (!redis) return 0;
  const v = await redis.get<string>(BUDGET_KEY());
  return v ? Number(v) : 0;
}
