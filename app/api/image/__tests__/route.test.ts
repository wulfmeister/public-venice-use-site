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
    applyImageRateLimit: vi.fn(() => ({
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
    jsonResponse,
  };
});

vi.mock("@/lib/validation", () => ({
  isNonEmptyString: vi.fn((s: unknown) => typeof s === "string" && s.trim().length > 0),
}));

const makeRequest = (body: Record<string, unknown>): NextRequest => {
  return new NextRequest("http://localhost/api/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

const VENICE_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";

const mockFetchSuccess = (format = "png") => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      data: [{ b64_json: VENICE_IMAGE_BASE64 }],
    }),
  });
};

describe("Image API Route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    mockFetchSuccess();
  });

  // Helper to import route fresh (uses mocked modules)
  const importRoute = async () => {
    return await import("../route");
  };

  it("OPTIONS returns 204", async () => {
    const { OPTIONS } = await importRoute();
    const response = await OPTIONS();
    expect(response.status).toBe(204);
  });

  it("valid prompt returns image_data_url", async () => {
    const { POST } = await importRoute();
    const response = await POST(makeRequest({ prompt: "a sunset over mountains" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.image_data_url).toBe(
      `data:image/png;base64,${VENICE_IMAGE_BASE64}`,
    );
    expect(data.mime).toBe("image/png");
  });

  it("empty prompt returns 400", async () => {
    const { POST } = await importRoute();
    const response = await POST(makeRequest({ prompt: "" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Prompt is required");
  });

  it("prompt too long returns 400", async () => {
    const { POST } = await importRoute();
    const longPrompt = "a".repeat(8001);
    const response = await POST(makeRequest({ prompt: longPrompt }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Prompt is too long");
    expect(data.limit).toBe(8000);
  });

  it("invalid model returns 400", async () => {
    const { POST } = await importRoute();
    const response = await POST(
      makeRequest({ prompt: "test", model: "nonexistent-model" }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid image model");
    expect(data.allowed_models).toBeDefined();
  });

  it("invalid size format returns 400", async () => {
    const { POST } = await importRoute();
    const response = await POST(
      makeRequest({ prompt: "test", size: "big" }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid image size format");
  });

  it("dimensions too small returns 400", async () => {
    const { POST } = await importRoute();
    const response = await POST(
      makeRequest({ prompt: "test", size: "32x32" }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Image dimensions out of bounds");
    expect(data.min).toBe(64);
    expect(data.max).toBe(2048);
  });

  it("dimensions too large returns 400", async () => {
    const { POST } = await importRoute();
    const response = await POST(
      makeRequest({ prompt: "test", size: "4096x4096" }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Image dimensions out of bounds");
  });

  it("invalid format returns 400", async () => {
    const { POST } = await importRoute();
    const response = await POST(
      makeRequest({ prompt: "test", format: "gif" }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid image format");
    expect(data.allowed_formats).toBeDefined();
  });

  it("jpg format converted to jpeg", async () => {
    const { POST } = await importRoute();
    const response = await POST(
      makeRequest({ prompt: "test", format: "jpg" }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.mime).toBe("image/jpeg");
    expect(data.image_data_url).toContain("data:image/jpeg;base64,");

    const fetchCall = (global.fetch as any).mock.calls[0];
    const sentBody = JSON.parse(fetchCall[1].body);
    expect(sentBody.output_format).toBe("jpeg");
  });

  it("Venice API error returns error status", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => "Unprocessable Entity",
    });

    const { POST } = await importRoute();
    const response = await POST(makeRequest({ prompt: "test" }));
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe("Venice image API error");
    expect(data.status).toBe(422);
  });

  it("no image data from Venice returns 502", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const { POST } = await importRoute();
    const response = await POST(makeRequest({ prompt: "test" }));
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("No image data returned");
  });

  it("network error returns 502", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

    const { POST } = await importRoute();
    const response = await POST(makeRequest({ prompt: "test" }));
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Failed to reach Venice image API");
  });

  it("default model/size/format used when not specified", async () => {
    const { POST } = await importRoute();
    const response = await POST(makeRequest({ prompt: "test" }));

    expect(response.status).toBe(200);

    const fetchCall = (global.fetch as any).mock.calls[0];
    const sentBody = JSON.parse(fetchCall[1].body);
    expect(sentBody.model).toBe("nano-banana-2");
    expect(sentBody.size).toBe("1024x1024");
    expect(sentBody.output_format).toBe("png");
  });
});
