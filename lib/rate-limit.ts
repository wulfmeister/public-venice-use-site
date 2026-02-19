import type { NextRequest } from "next/server";
import { CONSTANTS } from "./constants";

// Sliding-window rate limiter: stores timestamps per IP in memory.
// Resets on cold starts / redeployments (no persistent storage).
const rateLimitMap = new Map<string, number[]>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

const cleanupStaleEntries = (now: number) => {
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const windowStart = now - CONSTANTS.RATE_WINDOW;
  Array.from(rateLimitMap.entries()).forEach(([ip, timestamps]) => {
    const filtered = timestamps.filter((t: number) => t > windowStart);
    if (filtered.length === 0) {
      rateLimitMap.delete(ip);
    } else if (filtered.length !== timestamps.length) {
      rateLimitMap.set(ip, filtered);
    }
  });
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  windowMs: number;
  retryAfterSeconds?: number;
  clientIp: string;
}

const getClientIp = (request: NextRequest) => {
  const ip =
    (request as NextRequest & { ip?: string }).ip ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Truncate IPv6 to /64 prefix to avoid per-device rate limits
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return parts.slice(0, 4).join(":") + "::";
  }
  return ip;
};

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
}

export const checkRateLimit = (
  request: NextRequest,
  options: RateLimitOptions = {},
): RateLimitResult => {
  const clientIp = getClientIp(request);
  const now = Date.now();
  const limit = options.limit ?? CONSTANTS.RATE_LIMIT;
  const windowMs = options.windowMs ?? CONSTANTS.RATE_WINDOW;
  const windowStart = now - windowMs;

  cleanupStaleEntries(now);

  let requests = rateLimitMap.get(clientIp) || [];
  requests = requests.filter((timestamp) => timestamp > windowStart);

  if (requests.length >= limit) {
    const retryAfterSeconds = Math.ceil((requests[0] + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      limit,
      windowMs,
      retryAfterSeconds,
      clientIp,
    };
  }

  requests.push(now);
  rateLimitMap.set(clientIp, requests);

  return {
    allowed: true,
    remaining: Math.max(limit - requests.length, 0),
    limit,
    windowMs,
    clientIp,
  };
};
