import type { RedisOptions } from "ioredis";

/**
 * Convert a REDIS_URL (redis://user:pass@host:port/db) into ioredis options.
 * BullMQ requires `maxRetriesPerRequest: null` on the shared connection.
 */
export function parseRedisConnection(url: string): RedisOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || "localhost",
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    maxRetriesPerRequest: null
  };
}
