import { Redis } from "@upstash/redis";
import { logger } from "@/lib/axiom";
import { env } from "./env";

let _redis: Redis | null | undefined;

function createRedisClient(): Redis | null {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    if (process.env.NODE_ENV === "production") {
      logger.warn("UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting disabled");
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
