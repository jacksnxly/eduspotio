import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

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
    console.error("[rate-limit] Redis error, allowing request:", error);
    return { success: true, headers: {} };
  }
}
