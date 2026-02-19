import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Must import after stubbing fetch, and reset cache between tests
let fetchTextModels: typeof import("../venice-models").fetchTextModels;

beforeEach(async () => {
  mockFetch.mockReset();
  // Re-import to reset module-level cache
  vi.resetModules();
  const mod = await import("../venice-models");
  fetchTextModels = mod.fetchTextModels;
});

describe("fetchTextModels", () => {
  it("fetches and filters models from Venice API", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "kimi-k2-5",
              type: "text",
              model_spec: {
                pricing: { input: { usd: 0.5 }, output: { usd: 1.0 } },
                capabilities: {
                  supportsWebSearch: true,
                  supportsFunctionCalling: true,
                  supportsVision: false,
                  supportsReasoning: true,
                },
              },
            },
            {
              id: "cheap-model",
              type: "text",
              model_spec: {
                pricing: { input: { usd: 0.1 }, output: { usd: 0.2 } },
                capabilities: {
                  supportsWebSearch: false,
                  supportsFunctionCalling: false,
                  supportsVision: false,
                  supportsReasoning: false,
                },
              },
            },
            {
              id: "expensive-model",
              type: "text",
              model_spec: {
                pricing: { input: { usd: 10.0 }, output: { usd: 20.0 } },
                capabilities: {
                  supportsWebSearch: true,
                  supportsFunctionCalling: true,
                  supportsVision: true,
                  supportsReasoning: true,
                },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await fetchTextModels("test-key");

    expect(result.allowedModels).toContain("kimi-k2-5");
    expect(result.allowedModels).toContain("cheap-model");
    expect(result.allowedModels).not.toContain("expensive-model");
    expect(result.blockedModels).toHaveLength(1);
    expect(result.blockedModels[0].id).toBe("expensive-model");
  });

  it("always includes default model", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "other-model",
              type: "text",
              model_spec: {
                pricing: { input: { usd: 0.5 }, output: { usd: 1.0 } },
                capabilities: {},
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await fetchTextModels("test-key");
    expect(result.allowedModels).toContain("zai-org-glm-5");
  });

  it("returns fallback models on API error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await fetchTextModels("test-key");

    expect(result.allowedModels).toContain("zai-org-glm-5");
    expect(result.allowedModels).toContain("llama-3.3-70b");
    expect(result.blockedModels).toHaveLength(0);
  });

  it("returns fallback on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 }),
    );

    const result = await fetchTextModels("bad-key");

    expect(result.allowedModels.length).toBeGreaterThan(0);
  });

  it("includes model capabilities", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "vision-model",
              type: "text",
              model_spec: {
                pricing: { input: { usd: 0.5 }, output: { usd: 1.0 } },
                capabilities: {
                  supportsWebSearch: true,
                  supportsFunctionCalling: false,
                  supportsVision: true,
                  supportsReasoning: false,
                },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await fetchTextModels("test-key");
    expect(result.modelCapabilities["vision-model"]?.supportsVision).toBe(true);
    expect(result.modelCapabilities["vision-model"]?.supportsReasoning).toBe(
      false,
    );
  });
});
