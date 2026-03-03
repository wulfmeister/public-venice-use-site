import { describe, it, expect, vi, beforeEach } from "vitest";

// Re-import to reset module-level Map between tests
let checkRateLimit: typeof import("../rate-limit").checkRateLimit;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import("../rate-limit");
  checkRateLimit = mod.checkRateLimit;
});

function createMockRequest(ip = "1.2.3.4") {
  return {
    headers: {
      get: (name: string) => {
        if (name === "x-forwarded-for") return ip;
        return null;
      },
    },
  } as any;
}

describe("checkRateLimit", () => {
  it("allows first request", () => {
    const result = checkRateLimit(createMockRequest());
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(19);
    expect(result.limit).toBe(20);
  });

  it("tracks remaining requests", () => {
    const req = createMockRequest();
    checkRateLimit(req); // 1
    checkRateLimit(req); // 2
    const result = checkRateLimit(req); // 3
    expect(result.remaining).toBe(17);
  });

  it("blocks after limit exceeded", () => {
    const req = createMockRequest("2.3.4.5");
    for (let i = 0; i < 20; i++) {
      checkRateLimit(req);
    }
    const result = checkRateLimit(req);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks different IPs independently", () => {
    for (let i = 0; i < 20; i++) {
      checkRateLimit(createMockRequest("10.0.0.1"));
    }

    const result = checkRateLimit(createMockRequest("10.0.0.2"));
    expect(result.allowed).toBe(true);
  });

  it("extracts client IP from x-forwarded-for", () => {
    const result = checkRateLimit(createMockRequest("5.6.7.8"));
    expect(result.clientIp).toBe("5.6.7.8");
  });

  it("falls back to x-real-ip header", () => {
    const req = {
      headers: {
        get: (name: string) => {
          if (name === "x-real-ip") return "9.8.7.6";
          return null;
        },
      },
    } as any;
    const result = checkRateLimit(req);
    expect(result.clientIp).toBe("9.8.7.6");
  });

  it('uses "unknown" when no IP headers present', () => {
    const req = {
      headers: { get: () => null },
    } as any;
    const result = checkRateLimit(req);
    expect(result.clientIp).toBe("unknown");
  });

  it("extracts first IP from comma-separated x-forwarded-for", () => {
    const req = {
      headers: {
        get: (name: string) => {
          if (name === "x-forwarded-for") return "1.1.1.1, 2.2.2.2, 3.3.3.3";
          return null;
        },
      },
    } as any;
    const result = checkRateLimit(req);
    expect(result.clientIp).toBe("1.1.1.1");
  });

  it("tracks different endpoints independently", () => {
    const req = createMockRequest("6.7.8.9");
    // Exhaust image limit
    for (let i = 0; i < 5; i++) {
      checkRateLimit(req, { limit: 5, endpoint: "image" });
    }
    const imageResult = checkRateLimit(req, { limit: 5, endpoint: "image" });
    expect(imageResult.allowed).toBe(false);

    // Chat should still work (independent counter)
    const chatResult = checkRateLimit(req, { endpoint: "chat" });
    expect(chatResult.allowed).toBe(true);
    expect(chatResult.remaining).toBe(19);
  });

  it("uses separate maps for upscale endpoint", () => {
    const req = createMockRequest("10.11.12.13");
    // Use some chat requests
    checkRateLimit(req, { endpoint: "chat" });
    checkRateLimit(req, { endpoint: "chat" });

    // Upscale should have its own counter starting fresh
    const upscaleResult = checkRateLimit(req, {
      limit: 5,
      endpoint: "upscale",
    });
    expect(upscaleResult.allowed).toBe(true);
    expect(upscaleResult.remaining).toBe(4);
  });
});
