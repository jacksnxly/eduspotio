import { Redis } from "@upstash/redis";
import { env } from "./env";

let _redis: Redis | null | undefined;

function createRedisClient(): Redis | null {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[redis] UPSTASH_REDIS_REST_URL/TOKEN not set. Rate limiting on custom routes is disabled.",
      );
    }
    return null;
  }

  return new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
}

/** Lazily initialized to avoid accessing env at module-load time (breaks `next build`). */
export function getRedis(): Redis | null {
  if (_redis === undefined) {
    _redis = createRedisClient();
  }
  return _redis;
}
