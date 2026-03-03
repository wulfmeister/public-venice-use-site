import type { NextRequest } from "next/server";
import { CONSTANTS } from "./constants";

// Sliding-window rate limiter: stores timestamps per IP in memory.
// Resets on cold starts / redeployments (no persistent storage).
// Separate maps per endpoint type to enforce independent limits.
const rateLimitMaps = {
  chat: new Map<string, number[]>(),
  image: new Map<string, number[]>(),
  upscale: new Map<string, number[]>(),
} as const;

let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

const cleanupStaleEntries = (now: number, map: Map<string, number[]>) => {
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const windowStart = now - CONSTANTS.RATE_WINDOW;
  Array.from(map.entries()).forEach(([ip, timestamps]) => {
    const filtered = timestamps.filter((t) => t > windowStart);
    if (filtered.length === 0) {
      map.delete(ip);
    } else if (filtered.length !== timestamps.length) {
      map.set(ip, filtered);
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

export type RateLimitEndpoint = "chat" | "image" | "upscale";

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
  endpoint?: RateLimitEndpoint;
}

const getEnvLimit = (endpoint: RateLimitEndpoint): number | undefined => {
  const envKey = `RATE_LIMIT_${endpoint.toUpperCase()}`;
  const val = process.env[envKey];
  if (!val) return undefined;
  const parsed = parseInt(val, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export const checkRateLimit = (
  request: NextRequest,
  options: RateLimitOptions = {},
): RateLimitResult => {
  const clientIp = getClientIp(request);
  const now = Date.now();
  const endpoint = options.endpoint ?? "chat";
  const defaultLimit =
    endpoint === "image"
      ? CONSTANTS.RATE_LIMIT_IMAGE
      : endpoint === "upscale"
        ? CONSTANTS.RATE_LIMIT_UPSCALE
        : CONSTANTS.RATE_LIMIT_CHAT;
  const limit = getEnvLimit(endpoint) ?? options.limit ?? defaultLimit;
  const windowMs = options.windowMs ?? CONSTANTS.RATE_WINDOW;
  const windowStart = now - windowMs;
  const rateLimitMap = rateLimitMaps[endpoint];

  cleanupStaleEntries(now, rateLimitMap);

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
