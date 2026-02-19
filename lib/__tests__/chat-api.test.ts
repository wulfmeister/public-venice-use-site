import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendChatRequest, readErrorDetails } from "../chat-api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("sendChatRequest", () => {
  it("sends a POST request to /api/chat", async () => {
    mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    await sendChatRequest({
      model: "zai-org-glm-5",
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-TOS-Accepted": "true",
        }),
      }),
    );
  });

  it("includes model and messages in body", async () => {
    mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    await sendChatRequest({
      model: "zai-org-glm-5",
      messages: [{ role: "user", content: "Hello" }],
    });

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.model).toBe("zai-org-glm-5");
    expect(body.messages).toEqual([{ role: "user", content: "Hello" }]);
    expect(body.stream).toBe(true);
  });

  it("sets enable_web_search to auto when enabled", async () => {
    mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    await sendChatRequest({
      model: "test",
      messages: [{ role: "user", content: "search" }],
      webSearchEnabled: true,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.enable_web_search).toBe("auto");
  });

  it("sets enable_web_search to off when disabled", async () => {
    mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    await sendChatRequest({
      model: "test",
      messages: [{ role: "user", content: "no search" }],
      webSearchEnabled: false,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.enable_web_search).toBe("off");
  });

  it("includes system_prompt when provided", async () => {
    mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    await sendChatRequest({
      model: "test",
      messages: [{ role: "user", content: "hi" }],
      systemPrompt: "Be helpful",
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.system_prompt).toBe("Be helpful");
  });

  it("omits system_prompt when not provided", async () => {
    mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    await sendChatRequest({
      model: "test",
      messages: [{ role: "user", content: "hi" }],
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.system_prompt).toBeUndefined();
  });

  it("includes image_data_url when provided", async () => {
    mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    await sendChatRequest({
      model: "test",
      messages: [{ role: "user", content: "describe" }],
      imageDataUrl: "data:image/png;base64,abc",
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.image_data_url).toBe("data:image/png;base64,abc");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Rate limited", { status: 429 }),
    );

    await expect(
      sendChatRequest({
        model: "test",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toThrow("Request failed: 429");
  });
});

describe("readErrorDetails", () => {
  it("throws with status and body", async () => {
    const response = new Response("Some error", { status: 500 });
    await expect(readErrorDetails(response)).rejects.toThrow(
      "Request failed: 500 - Some error",
    );
  });
});
