import { z } from "zod";
import { logger } from "@/lib/axiom";
import { getRedis } from "../redis";

const CACHE_TTL_SECONDS = 86_400; // 24 hours
const KEY_PREFIX = "eduspot:apiKeyCache:";

/**
 * Wrapper shape stored in Redis.
 * Distinguishes cache miss (redis returns null) from "key has no metadata"
 * (redis returns { metadata: null }).
 */
const cacheEntrySchema = z.object({
  metadata: z.unknown().nullable(),
});

type CacheEntry = z.infer<typeof cacheEntrySchema>;

class ApiKeyCache {
  private key(keyId: string): string {
    return `${KEY_PREFIX}${keyId}`;
  }

  /** Returns the cached metadata wrapper, or null on cache miss / Redis failure. */
  async get(keyId: string): Promise<CacheEntry | null> {
    try {
      const redis = getRedis();
      if (!redis) return null;

      const raw = await redis.get<CacheEntry>(this.key(keyId));
      if (raw === null) return null;

      const parsed = cacheEntrySchema.safeParse(raw);
      if (!parsed.success) {
        logger.warn("API key cache: invalid entry, treating as miss", {
          keyId,
          error: parsed.error.message,
        });
        return null;
      }

      return parsed.data;
    } catch (err) {
      logger.warn("API key cache: get failed", {
        keyId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /** Write metadata to cache. Fails silently on Redis errors. */
  async set(keyId: string, metadata: unknown): Promise<void> {
    try {
      const redis = getRedis();
      if (!redis) return;

      const entry: CacheEntry = { metadata: metadata ?? null };
      await redis.set(this.key(keyId), entry, { ex: CACHE_TTL_SECONDS });
    } catch (err) {
      logger.warn("API key cache: set failed", {
        keyId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /** Remove a key from cache. Fails silently on Redis errors. */
  async delete(keyId: string): Promise<void> {
    try {
      const redis = getRedis();
      if (!redis) return;

      await redis.del(this.key(keyId));
    } catch (err) {
      logger.warn("API key cache: delete failed", {
        keyId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

export const apiKeyCache = new ApiKeyCache();
