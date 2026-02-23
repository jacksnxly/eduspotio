import { Redis } from "@upstash/redis";

function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[redis] UPSTASH_REDIS_REST_URL/TOKEN not set. Rate limiting on custom routes is disabled.",
      );
    }
    return null;
  }

  return new Redis({ url, token });
}

export const redis = createRedisClient();
