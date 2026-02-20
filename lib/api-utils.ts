import type { NextRequest } from "next/server";
import { CONSTANTS } from "./constants";
import { checkRateLimit, RateLimitResult } from "./rate-limit";

let corsWarningLogged = false;

export const createCorsHeaders = (methods: string[]) => {
  if (!process.env.ALLOWED_ORIGIN && !corsWarningLogged) {
    console.warn("ALLOWED_ORIGIN is not set — CORS is open to all origins. Set ALLOWED_ORIGIN in production.");
    corsWarningLogged = true;
  }
  return {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": methods.join(", "),
    "Access-Control-Allow-Headers": "Content-Type, X-TOS-Accepted, X-Deployment-Password",
  };
};

export const jsonResponse = (
  data: unknown,
  options: ResponseInit & { corsHeaders?: HeadersInit } = {},
) => {
  const { corsHeaders, headers, status, ...rest } = options;
  return new Response(JSON.stringify(data), {
    ...rest,
    status: status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...(corsHeaders || {}),
      ...(headers || {}),
    },
  });
};

export const handleOptions = (corsHeaders: HeadersInit) =>
  new Response(null, {
    status: 204,
    headers: corsHeaders,
  });

export const ensureDeploymentPassword = (
  request: NextRequest,
  corsHeaders: HeadersInit,
) => {
  const required = process.env.DEPLOYMENT_PASSWORD;
  if (!required) return null;
  const provided = request.headers.get("X-Deployment-Password");
  if (provided !== required) {
    return jsonResponse(
      { error: "Invalid deployment password" },
      { status: 401, corsHeaders },
    );
  }
  return null;
};

export const ensureTosAccepted = (
  request: NextRequest,
  corsHeaders: HeadersInit,
) => {
  const tosAccepted = request.headers.get("X-TOS-Accepted");
  if (tosAccepted !== "true") {
    return jsonResponse(
      {
        error: "Terms of Service not accepted",
        message: "You must include header: X-TOS-Accepted: true",
        tos_url: "/tos.html",
      },
      { status: 403, corsHeaders },
    );
  }
  return null;
};

export const ensureApiKey = (corsHeaders: HeadersInit) => {
  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) {
    return {
      error: jsonResponse(
        {
          error: "Server configuration error",
          message: "Venice API key not configured",
        },
        { status: 500, corsHeaders },
      ),
    };
  }

  return { apiKey };
};

export const parseJsonBody = async <T>(
  request: NextRequest,
  corsHeaders: HeadersInit,
) => {
  try {
    const body = await request.json();
    return { body: body as T };
  } catch {
    return {
      error: jsonResponse(
        { error: "Invalid JSON body" },
        { status: 400, corsHeaders },
      ),
    };
  }
};

export const applyRateLimit = (
  request: NextRequest,
  corsHeaders: HeadersInit,
) => {
  const result = checkRateLimit(request);
  if (!result.allowed) {
    return {
      error: jsonResponse(
        {
          error: "Rate limit exceeded",
          limit: result.limit,
          window: "1 hour",
          retry_after_seconds: result.retryAfterSeconds,
        },
        {
          status: 429,
          corsHeaders,
          headers: {
            "Retry-After": String(result.retryAfterSeconds || 0),
          },
        },
      ),
    };
  }

  return { rateLimit: result };
};

export const applyImageRateLimit = (
  request: NextRequest,
  corsHeaders: HeadersInit,
) => {
  const result = checkRateLimit(request, { limit: CONSTANTS.RATE_LIMIT_IMAGE });
  if (!result.allowed) {
    return {
      error: jsonResponse(
        {
          error: "Image generation rate limit exceeded",
          limit: result.limit,
          window: "1 hour",
          retry_after_seconds: result.retryAfterSeconds,
        },
        {
          status: 429,
          corsHeaders,
          headers: {
            "Retry-After": String(result.retryAfterSeconds || 0),
          },
        },
      ),
    };
  }

  return { rateLimit: result };
};

export const applyUpscaleRateLimit = (
  request: NextRequest,
  corsHeaders: HeadersInit,
) => {
  const result = checkRateLimit(request, {
    limit: CONSTANTS.RATE_LIMIT_UPSCALE,
  });
  if (!result.allowed) {
    return {
      error: jsonResponse(
        {
          error: "Image upscale rate limit exceeded",
          limit: result.limit,
          window: "1 hour",
          retry_after_seconds: result.retryAfterSeconds,
        },
        {
          status: 429,
          corsHeaders,
          headers: {
            "Retry-After": String(result.retryAfterSeconds || 0),
          },
        },
      ),
    };
  }

  return { rateLimit: result };
};

export const buildRateLimitHeaders = (rateLimit: RateLimitResult) => ({
  "X-RateLimit-Remaining": String(rateLimit.remaining),
  "X-RateLimit-Limit": String(rateLimit.limit),
});

export const parseImageScale = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

export const clampMaxTokens = (value: unknown, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const rounded = Number.isInteger(value) ? value : Math.round(value);
  return Math.min(Math.max(rounded, 1), CONSTANTS.DEFAULT_MAX_TOKENS * 2);
};
