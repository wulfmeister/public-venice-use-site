import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api-utils", () => {
  const jsonResponse = (data: unknown, options: any = {}) => {
    return new Response(JSON.stringify(data), {
      status: options.status ?? 200,
      headers: {
        "Content-Type": "application/json",
        ...(options.corsHeaders || {}),
        ...(options.headers || {}),
      },
    });
  };
  return {
    createCorsHeaders: vi.fn(() => ({ "Access-Control-Allow-Origin": "*" })),
    handleOptions: vi.fn(
      (cors: any) => new Response(null, { status: 204, headers: cors }),
    ),
    ensureApiKey: vi.fn(() => ({ apiKey: "test-key" })),
    jsonResponse,
  };
});

vi.mock("@/lib/venice-models", () => ({
  fetchTextModels: vi.fn(async () => ({
    allowedModels: ["llama-3.3-70b", "deepseek-r1-distill-llama-70b"],
    modelCapabilities: {
      "llama-3.3-70b": {
        supportsWebSearch: true,
        supportsFunctionCalling: false,
        supportsVision: false,
        supportsReasoning: false,
      },
    },
    blockedModels: [],
  })),
}));

const mockFetchSuccess = () => {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes("type=image")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: [
            { id: "nano-banana-2", type: "image" },
            { id: "seedream-v4", type: "image" },
          ],
        }),
      });
    }
    if (url.includes("type=upscale")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: [{ id: "upscaler", type: "upscale" }],
        }),
      });
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
};

describe("Info API Route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    mockFetchSuccess();
    delete process.env.RATE_LIMIT_CHAT;
    delete process.env.RATE_LIMIT_IMAGE;
    delete process.env.RATE_LIMIT_UPSCALE;
    delete process.env.DEPLOYMENT_PASSWORD;
  });

  const importRoute = async () => {
    return await import("../route");
  };

  it("OPTIONS returns 204", async () => {
    const { OPTIONS } = await importRoute();
    const response = await OPTIONS();
    expect(response.status).toBe(204);
  });

  it("returns full info payload with models", async () => {
    const { GET } = await importRoute();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe("OpenChat");
    expect(data.version).toBe("1.0.0");
    expect(data.image_models).toContain("nano-banana-2");
    expect(data.image_models).toContain("seedream-v4");
    expect(data.image_models).toContain("upscaler");
    expect(data.endpoints.chat).toBe("/api/chat");
    expect(data.endpoints.info).toBe("/api/info");
    expect(data.usage.required_header).toBe("X-TOS-Accepted: true");
    expect(data.rate_limit.window).toBe("1 hour");
    expect(data.rate_limit.per).toBe("IP address");
  });

  it("falls back to default image models on API error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { GET } = await importRoute();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.image_models).toEqual([
      "nano-banana-2",
      "seedream-v4",
      "nano-banana-pro",
      "venice-sd35",
      "upscaler",
    ]);
  });

  it("uses env rate limits when set", async () => {
    process.env.RATE_LIMIT_CHAT = "50";
    process.env.RATE_LIMIT_IMAGE = "10";
    process.env.RATE_LIMIT_UPSCALE = "15";

    const { GET } = await importRoute();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rate_limit.chat).toBe(50);
    expect(data.rate_limit.image).toBe(10);
    expect(data.rate_limit.upscale).toBe(15);
  });

  it("password_required reflects DEPLOYMENT_PASSWORD env", async () => {
    process.env.DEPLOYMENT_PASSWORD = "secret123";

    const { GET } = await importRoute();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.password_required).toBe(true);
  });

  it("missing API key returns 500", async () => {
    const apiUtils = await import("@/lib/api-utils");
    vi.mocked(apiUtils.ensureApiKey).mockReturnValue({
      error: new Response(
        JSON.stringify({ error: "API key not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      ),
    } as any);

    const { GET } = await importRoute();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("API key not configured");
  });

  it("includes text models from fetchTextModels", async () => {
    const { GET } = await importRoute();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.models).toEqual([
      "llama-3.3-70b",
      "deepseek-r1-distill-llama-70b",
    ]);
    expect(data.model_capabilities).toHaveProperty("llama-3.3-70b");
    expect(data.model_capabilities["llama-3.3-70b"].supportsWebSearch).toBe(
      true,
    );
  });
});
