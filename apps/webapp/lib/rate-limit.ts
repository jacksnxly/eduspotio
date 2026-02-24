import { Ratelimit } from "@upstash/ratelimit";
import { logger } from "@/lib/axiom";
import { getRedis } from "./redis";

type RateLimitResult = {
  success: boolean;
  headers: HeadersInit;
};

export async function rateLimit(
  identifier: string,
  opts?: {
    limit?: number;
    window?: `${number} s` | `${number} m` | `${number} h`;
  },
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) {
    return { success: true, headers: {} };
  }

  try {
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        opts?.limit ?? 60,
        opts?.window ?? "1 m",
      ),
      timeout: 1000,
    });

    const { success, limit, remaining, reset } =
      await limiter.limit(identifier);

    const headers: HeadersInit = {
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": reset.toString(),
    };

    return { success, headers };
  } catch (error) {
    logger.error("Redis error, allowing request", { error: error instanceof Error ? error.message : String(error) });
    return { success: true, headers: {} };
  }
}
