import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/venice-models", () => ({
  fetchTextModels: vi.fn(),
}));

vi.mock("@/lib/api-utils", () => {
  const jsonResponse = (
    data: unknown,
    options: { status?: number; corsHeaders?: Record<string, string>; headers?: Record<string, string> } = {},
  ) => {
    const { corsHeaders, headers, status } = options;
    return new Response(JSON.stringify(data), {
      status: status ?? 200,
      headers: {
        "Content-Type": "application/json",
        ...(corsHeaders || {}),
        ...(headers || {}),
      },
    });
  };

  return {
    createCorsHeaders: vi.fn(() => ({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, X-TOS-Accepted, X-Deployment-Password",
    })),
    handleOptions: vi.fn(
      (cors: HeadersInit) => new Response(null, { status: 204, headers: cors }),
    ),
    ensureDeploymentPassword: vi.fn(() => null),
    ensureTosAccepted: vi.fn(() => null),
    applyRateLimit: vi.fn(() => ({
      rateLimit: {
        allowed: true,
        remaining: 19,
        limit: 20,
        windowMs: 3600000,
        clientIp: "1.2.3.4",
      },
    })),
    parseJsonBody: vi.fn(async (req: Request) => {
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
    buildRateLimitHeaders: vi.fn(() => ({
      "X-RateLimit-Remaining": "19",
      "X-RateLimit-Limit": "20",
    })),
    jsonResponse,
    clampMaxTokens: vi.fn((val: unknown, fallback: number) => {
      if (typeof val !== "number" || !Number.isFinite(val)) return fallback;
      const rounded = Number.isInteger(val) ? val : Math.round(val);
      return Math.min(Math.max(rounded, 1), fallback * 2);
    }),
  };
});

// Import route handlers after mocks are registered
import { POST, OPTIONS } from "../route";
import { fetchTextModels } from "@/lib/venice-models";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockedFetchTextModels = fetchTextModels as ReturnType<typeof vi.fn>;

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    model: "test-model",
    messages: [{ role: "user", content: "Hello" }],
    enable_web_search: "auto",
    ...overrides,
  };
}

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

async function jsonFrom(response: Response) {
  return JSON.parse(await response.text());
}

// Fake streaming body helper
function fakeStream(chunks: string[] = ["data: {}\n\n"]) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    },
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();

  mockedFetchTextModels.mockResolvedValue({
    allowedModels: ["test-model", "vision-model"],
    modelCapabilities: {
      "test-model": { supportsVision: false },
      "vision-model": { supportsVision: true },
    },
    blockedModels: [],
  });

  // Default: Venice returns a successful streaming response
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(fakeStream(), {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    ),
  );
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Chat API route", () => {
  // 1 -----------------------------------------------------------------------
  it("OPTIONS returns 204", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  // 2 -----------------------------------------------------------------------
  it("POST with valid body returns streaming response", async () => {
    const res = await POST(makeRequest(validBody()));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache");
    expect(res.body).toBeTruthy();
  });

  // 3 -----------------------------------------------------------------------
  it("POST with stream:false returns non-streaming JSON response", async () => {
    const payload = { answer: "hello" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const res = await POST(makeRequest(validBody({ stream: false })));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    const data = await jsonFrom(res);
    expect(data).toEqual(payload);
  });

  // 4 -----------------------------------------------------------------------
  it("invalid model returns 400", async () => {
    const res = await POST(makeRequest(validBody({ model: "unknown-model" })));

    expect(res.status).toBe(400);
    const data = await jsonFrom(res);
    expect(data.error).toMatch(/invalid or disallowed model/i);
    expect(data.allowed_models).toContain("test-model");
  });

  // 5 -----------------------------------------------------------------------
  it("empty messages array returns 400", async () => {
    const res = await POST(makeRequest(validBody({ messages: [] })));

    expect(res.status).toBe(400);
    const data = await jsonFrom(res);
    expect(data.error).toMatch(/messages array is required/i);
  });

  // 6 -----------------------------------------------------------------------
  it("too many messages returns 400", async () => {
    const messages = Array.from({ length: 51 }, (_, i) => ({
      role: "user",
      content: `Message ${i}`,
    }));
    const res = await POST(makeRequest(validBody({ messages })));

    expect(res.status).toBe(400);
    const data = await jsonFrom(res);
    expect(data.error).toMatch(/too many messages/i);
    expect(data.limit).toBe(50);
  });

  // 7 -----------------------------------------------------------------------
  it("invalid message object returns 400", async () => {
    const res = await POST(
      makeRequest(validBody({ messages: ["not-an-object", { role: "user", content: "hi" }] })),
    );

    expect(res.status).toBe(400);
    const data = await jsonFrom(res);
    expect(data.error).toMatch(/invalid message payload/i);
  });

  // 8 -----------------------------------------------------------------------
  it("invalid role returns 400", async () => {
    const res = await POST(
      makeRequest(
        validBody({ messages: [{ role: "hacker", content: "hi" }] }),
      ),
    );

    expect(res.status).toBe(400);
    const data = await jsonFrom(res);
    expect(data.error).toMatch(/invalid message role/i);
    expect(data.allowed_roles).toEqual(["user", "assistant", "system"]);
  });

  // 9 -----------------------------------------------------------------------
  it("empty content returns 400", async () => {
    const res = await POST(
      makeRequest(validBody({ messages: [{ role: "user", content: "" }] })),
    );

    expect(res.status).toBe(400);
    const data = await jsonFrom(res);
    expect(data.error).toMatch(/message content is required/i);
  });

  // 10 ----------------------------------------------------------------------
  it("oversized message returns 400", async () => {
    const longContent = "x".repeat(8001);
    const res = await POST(
      makeRequest(
        validBody({ messages: [{ role: "user", content: longContent }] }),
      ),
    );

    expect(res.status).toBe(400);
    const data = await jsonFrom(res);
    expect(data.error).toMatch(/message content is too long/i);
    expect(data.limit).toBe(8000);
  });

  // 11 ----------------------------------------------------------------------
  it("invalid web search mode returns 400", async () => {
    const res = await POST(
      makeRequest(validBody({ enable_web_search: "always" })),
    );

    expect(res.status).toBe(400);
    const data = await jsonFrom(res);
    expect(data.error).toMatch(/invalid web search mode/i);
    expect(data.allowed_values).toEqual(["auto", "on", "off"]);
  });

  // 12 ----------------------------------------------------------------------
  it("non-number temperature returns 400", async () => {
    const res = await POST(
      makeRequest(validBody({ temperature: "warm" })),
    );

    expect(res.status).toBe(400);
    const data = await jsonFrom(res);
    expect(data.error).toMatch(/temperature must be a number/i);
  });

  // 13 ----------------------------------------------------------------------
  it("temperature out of range returns 400", async () => {
    const res = await POST(makeRequest(validBody({ temperature: 3 })));

    expect(res.status).toBe(400);
    const data = await jsonFrom(res);
    expect(data.error).toMatch(/temperature must be between 0 and 2/i);
  });

  // 14 ----------------------------------------------------------------------
  it("invalid max_tokens returns 400", async () => {
    const res = await POST(makeRequest(validBody({ max_tokens: -5 })));

    expect(res.status).toBe(400);
    const data = await jsonFrom(res);
    expect(data.error).toMatch(/max_tokens must be a positive integer/i);
  });

  // 15 ----------------------------------------------------------------------
  it("invalid image data URL returns 400", async () => {
    const res = await POST(
      makeRequest(
        validBody({
          model: "vision-model",
          image_data_url: "not-a-data-url",
        }),
      ),
    );

    expect(res.status).toBe(400);
    const data = await jsonFrom(res);
    expect(data.error).toMatch(/invalid image data url/i);
  });

  // 16 ----------------------------------------------------------------------
  it("image with non-vision model returns 400", async () => {
    const res = await POST(
      makeRequest(
        validBody({
          model: "test-model",
          image_data_url: "data:image/png;base64,abc123",
        }),
      ),
    );

    expect(res.status).toBe(400);
    const data = await jsonFrom(res);
    expect(data.error).toMatch(/does not support vision/i);
  });

  // 17 ----------------------------------------------------------------------
  it("system prompt is trimmed and included in Venice request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(fakeStream(), {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await POST(
      makeRequest(validBody({ system_prompt: "  Be helpful  " })),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.messages[0]).toEqual({
      role: "system",
      content: "Be helpful",
    });
  });

  // 18 ----------------------------------------------------------------------
  it("Venice API error returns the error status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Service Unavailable", { status: 503 }),
      ),
    );

    const res = await POST(makeRequest(validBody()));

    expect(res.status).toBe(503);
    const data = await jsonFrom(res);
    expect(data.error).toMatch(/venice api error/i);
    expect(data.status).toBe(503);
  });

  // 19 ----------------------------------------------------------------------
  it("network error returns 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    );

    const res = await POST(makeRequest(validBody()));

    expect(res.status).toBe(502);
    const data = await jsonFrom(res);
    expect(data.error).toMatch(/failed to reach venice api/i);
  });

  // 20 ----------------------------------------------------------------------
  it("vision model formats multipart content for the last user message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(fakeStream(), {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const imageUrl = "data:image/png;base64,iVBORw0KGgoAAAANS";

    await POST(
      makeRequest(
        validBody({
          model: "vision-model",
          image_data_url: imageUrl,
          messages: [
            { role: "user", content: "First message" },
            { role: "assistant", content: "Response" },
            { role: "user", content: "Describe this image" },
          ],
        }),
      ),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);

    // First user message should remain unchanged
    expect(callBody.messages[0]).toEqual({
      role: "user",
      content: "First message",
    });

    // Assistant message unchanged
    expect(callBody.messages[1]).toEqual({
      role: "assistant",
      content: "Response",
    });

    // Last user message should have multipart content with image
    const lastMessage = callBody.messages[2];
    expect(lastMessage.role).toBe("user");
    expect(Array.isArray(lastMessage.content)).toBe(true);
    expect(lastMessage.content).toHaveLength(2);
    expect(lastMessage.content[0]).toEqual({
      type: "text",
      text: "Describe this image",
    });
    expect(lastMessage.content[1]).toEqual({
      type: "image_url",
      image_url: { url: imageUrl },
    });
  });
});
