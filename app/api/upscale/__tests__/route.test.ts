import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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
    ensureDeploymentPassword: vi.fn(() => null),
    ensureTosAccepted: vi.fn(() => null),
    applyUpscaleRateLimit: vi.fn(() => ({
      rateLimit: { allowed: true, remaining: 4, limit: 5 },
    })),
    parseJsonBody: vi.fn(async (req: any) => {
      try {
        const body = await req.json();
        return { body };
      } catch {
        return {
          error: jsonResponse(
            { error: "Invalid JSON body" },
            { status: 400 },
          ),
        };
      }
    }),
    ensureApiKey: vi.fn(() => ({ apiKey: "test-key" })),
    parseImageScale: vi.fn((val: any, fallback: number) => {
      if (typeof val === "number" && Number.isFinite(val)) return val;
      if (typeof val === "string") {
        const p = Number(val);
        if (!isNaN(p)) return p;
      }
      return fallback;
    }),
    jsonResponse,
  };
});

vi.mock("@/lib/validation", () => ({
  isValidDataUrl: vi.fn((url: string, types: string[]) => {
    if (!url || typeof url !== "string") return false;
    const match = url.match(/^data:([^;,]+)/);
    if (!match) return false;
    return types.includes(match[1]);
  }),
}));

const SAMPLE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";
const VALID_DATA_URL = `data:image/png;base64,${SAMPLE_BASE64}`;

const makeRequest = (body: Record<string, unknown>): NextRequest => {
  return new NextRequest("http://localhost/api/upscale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

const UPSCALED_IMAGE_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

const mockFetchSuccess = () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: async () => UPSCALED_IMAGE_BYTES.buffer,
    headers: new Headers({ "content-type": "image/png" }),
  });
};

describe("Upscale API Route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    mockFetchSuccess();
  });

  const importRoute = async () => {
    return await import("../route");
  };

  it("OPTIONS returns 204", async () => {
    const { OPTIONS } = await importRoute();
    const response = await OPTIONS();
    expect(response.status).toBe(204);
  });

  it("valid upscale request returns image data", async () => {
    const { POST } = await importRoute();
    const response = await POST(
      makeRequest({ image_data_url: VALID_DATA_URL, scale: 2 }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.image_data_url).toContain("data:image/png;base64,");
    expect(data.mime).toBe("image/png");
  });

  it("missing image_data_url returns 400", async () => {
    const { POST } = await importRoute();
    const response = await POST(makeRequest({ scale: 2 }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("image_data_url is required");
  });

  it("invalid data URL returns 400", async () => {
    const { POST } = await importRoute();
    const response = await POST(
      makeRequest({ image_data_url: "not-a-data-url", scale: 2 }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid image data URL");
  });

  it("scale out of range returns 400", async () => {
    const { POST } = await importRoute();
    const response = await POST(
      makeRequest({ image_data_url: VALID_DATA_URL, scale: 10 }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid upscale scale");
    expect(data.allowed_range).toEqual([1, 4]);
  });

  it("missing base64 after comma returns 400", async () => {
    const { POST } = await importRoute();
    const response = await POST(
      makeRequest({ image_data_url: "data:image/png;base64," }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid image data");
  });

  it("Venice API error returns error status", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => "Unprocessable Entity",
    });

    const { POST } = await importRoute();
    const response = await POST(
      makeRequest({ image_data_url: VALID_DATA_URL, scale: 2 }),
    );
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe("Venice upscale API error");
    expect(data.status).toBe(422);
  });

  it("network error returns 502", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Connection refused"));

    const { POST } = await importRoute();
    const response = await POST(
      makeRequest({ image_data_url: VALID_DATA_URL, scale: 2 }),
    );
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Failed to reach Venice upscale API");
  });
});
