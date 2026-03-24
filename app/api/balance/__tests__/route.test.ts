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
    ensureApiKey: vi.fn(() => ({ apiKey: "test-key" })),
    jsonResponse,
  };
});

const makeGetRequest = (): NextRequest => {
  return new NextRequest("http://localhost/api/balance", {
    method: "GET",
  });
};

const BALANCE_DATA = {
  balance: "100.00",
  currency: "USD",
};

const mockFetchSuccess = () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => BALANCE_DATA,
  });
};

describe("Balance API Route", () => {
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

  it("valid GET returns balance data", async () => {
    const { GET } = await importRoute();
    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.balance).toBe("100.00");
    expect(data.currency).toBe("USD");
  });

  it("missing TOS returns 403", async () => {
    const apiUtils = await import("@/lib/api-utils");
    vi.mocked(apiUtils.ensureTosAccepted).mockReturnValue(
      new Response(JSON.stringify({ error: "TOS not accepted" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { GET } = await importRoute();
    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("TOS not accepted");
  });

  it("missing password returns 401", async () => {
    const apiUtils = await import("@/lib/api-utils");
    vi.mocked(apiUtils.ensureDeploymentPassword).mockReturnValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { GET } = await importRoute();
    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("Venice API failure returns 502", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    });

    const { GET } = await importRoute();
    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Unable to fetch balance");
  });

  it("network error returns 502", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Connection refused"));

    const { GET } = await importRoute();
    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Unable to fetch balance");
  });
});
