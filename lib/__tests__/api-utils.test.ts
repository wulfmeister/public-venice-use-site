import { describe, it, expect } from "vitest";
import {
  createCorsHeaders,
  jsonResponse,
  handleOptions,
  ensureTosAccepted,
  ensureApiKey,
  parseJsonBody,
  buildRateLimitHeaders,
  parseImageScale,
  clampMaxTokens,
} from "../api-utils";
import type { NextRequest } from "next/server";

describe("createCorsHeaders", () => {
  it("creates headers with specified methods", () => {
    const headers = createCorsHeaders(["GET", "POST"]);
    expect(headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(headers["Access-Control-Allow-Methods"]).toBe("GET, POST");
    expect(headers["Access-Control-Allow-Headers"]).toBe(
      "Content-Type, X-TOS-Accepted",
    );
  });
});

describe("jsonResponse", () => {
  it("returns a Response with JSON content type", async () => {
    const res = jsonResponse({ hello: "world" });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    const body = await res.json();
    expect(body).toEqual({ hello: "world" });
  });

  it("respects custom status", async () => {
    const res = jsonResponse({ error: "bad" }, { status: 400 });
    expect(res.status).toBe(400);
  });

  it("merges CORS headers", () => {
    const cors = createCorsHeaders(["POST"]);
    const res = jsonResponse({}, { corsHeaders: cors });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("handleOptions", () => {
  it("returns 204 with CORS headers", () => {
    const cors = createCorsHeaders(["POST"]);
    const res = handleOptions(cors);
    expect(res.status).toBe(204);
  });
});

describe("buildRateLimitHeaders", () => {
  it("builds rate limit headers from result", () => {
    const headers = buildRateLimitHeaders({
      allowed: true,
      remaining: 15,
      limit: 20,
      windowMs: 3600000,
      clientIp: "1.2.3.4",
    });
    expect(headers["X-RateLimit-Remaining"]).toBe("15");
    expect(headers["X-RateLimit-Limit"]).toBe("20");
  });
});

describe("ensureTosAccepted", () => {
  const cors = createCorsHeaders(["POST"]);

  it("returns null when TOS is accepted", () => {
    const request = {
      headers: {
        get: (name: string) => (name === "X-TOS-Accepted" ? "true" : null),
      },
    } as unknown as NextRequest;
    expect(ensureTosAccepted(request, cors)).toBeNull();
  });

  it("returns 403 response when TOS is not accepted", async () => {
    const request = {
      headers: { get: () => null },
    } as unknown as NextRequest;
    const result = ensureTosAccepted(request, cors);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    const body = await result!.json();
    expect(body.error).toBe("Terms of Service not accepted");
  });
});

describe("ensureApiKey", () => {
  const cors = createCorsHeaders(["POST"]);

  it("returns apiKey when env is set", () => {
    const originalKey = process.env.VENICE_API_KEY;
    process.env.VENICE_API_KEY = "test-key-123";
    const result = ensureApiKey(cors);
    expect(result).toEqual({ apiKey: "test-key-123" });
    process.env.VENICE_API_KEY = originalKey;
  });

  it("returns error response when env is not set", async () => {
    const originalKey = process.env.VENICE_API_KEY;
    delete process.env.VENICE_API_KEY;
    const result = ensureApiKey(cors);
    expect(result.error).toBeDefined();
    expect(result.error!.status).toBe(500);
    process.env.VENICE_API_KEY = originalKey;
  });
});

describe("parseJsonBody", () => {
  const cors = createCorsHeaders(["POST"]);

  it("parses valid JSON body", async () => {
    const request = {
      json: async () => ({ model: "test", messages: [] }),
    } as unknown as NextRequest;
    const result = await parseJsonBody(request, cors);
    expect(result.body).toEqual({ model: "test", messages: [] });
    expect(result.error).toBeUndefined();
  });

  it("returns 400 for invalid JSON", async () => {
    const request = {
      json: async () => {
        throw new Error("bad json");
      },
    } as unknown as NextRequest;
    const result = await parseJsonBody(request, cors);
    expect(result.error).toBeDefined();
    expect(result.error!.status).toBe(400);
  });
});

describe("parseImageScale", () => {
  it("returns number as-is", () => {
    expect(parseImageScale(3, 2)).toBe(3);
  });

  it("parses string numbers", () => {
    expect(parseImageScale("4", 2)).toBe(4);
  });

  it("returns fallback for invalid values", () => {
    expect(parseImageScale("abc", 2)).toBe(2);
    expect(parseImageScale(null, 2)).toBe(2);
    expect(parseImageScale(undefined, 2)).toBe(2);
  });
});

describe("clampMaxTokens", () => {
  it("returns valid integer values", () => {
    expect(clampMaxTokens(1024, 2048)).toBe(1024);
  });

  it("rounds float values", () => {
    expect(clampMaxTokens(1024.7, 2048)).toBe(1025);
  });

  it("clamps to maximum", () => {
    expect(clampMaxTokens(99999, 2048)).toBe(4096); // 2048 * 2
  });

  it("clamps to minimum of 1", () => {
    expect(clampMaxTokens(-5, 2048)).toBe(1);
  });

  it("returns fallback for non-numbers", () => {
    expect(clampMaxTokens("abc", 2048)).toBe(2048);
    expect(clampMaxTokens(null, 2048)).toBe(2048);
    expect(clampMaxTokens(NaN, 2048)).toBe(2048);
  });
});
