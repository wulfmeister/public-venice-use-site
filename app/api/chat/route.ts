// Next.js API Route with Streaming Support

import type { NextRequest } from "next/server";
import { CONSTANTS } from "@/lib/constants";
import {
  applyRateLimit,
  buildRateLimitHeaders,
  clampMaxTokens,
  createCorsHeaders,
  ensureApiKey,
  ensureTosAccepted,
  handleOptions,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api-utils";
import { fetchTextModels } from "@/lib/venice-models";
import {
  isNonEmptyString,
  isPositiveInteger,
  isValidDataUrl,
  isValidRole,
  isValidWebSearchMode,
} from "@/lib/validation";
import { ChatRequest } from "@/lib/types";

const corsHeaders = createCorsHeaders(["POST", "OPTIONS"]);
const allowedImageTypes = ["image/png", "image/jpeg", "image/webp"];

export async function OPTIONS() {
  return handleOptions(corsHeaders);
}

export async function POST(request: NextRequest) {
  const tosError = ensureTosAccepted(request, corsHeaders);
  if (tosError) return tosError;

  const rateLimitResult = applyRateLimit(request, corsHeaders);
  if (rateLimitResult.error) return rateLimitResult.error;
  const rateLimit = rateLimitResult.rateLimit;

  const parsedBody = await parseJsonBody<
    ChatRequest & { system_prompt?: string }
  >(request, corsHeaders);
  if (parsedBody.error) return parsedBody.error;
  const body = parsedBody.body;

  const apiKeyResult = ensureApiKey(corsHeaders);
  if (apiKeyResult.error) return apiKeyResult.error;
  const apiKey = apiKeyResult.apiKey;

  const { allowedModels, modelCapabilities } = await fetchTextModels(apiKey);

  if (!body.model || !allowedModels.includes(body.model)) {
    return jsonResponse(
      {
        error: "Invalid or disallowed model",
        allowed_models: allowedModels,
      },
      { status: 400, corsHeaders },
    );
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return jsonResponse(
      { error: "Messages array is required" },
      { status: 400, corsHeaders },
    );
  }

  if (body.messages.length > CONSTANTS.MAX_CHAT_MESSAGES) {
    console.error("Too many messages in request", body.messages.length);
    return jsonResponse(
      {
        error: "Too many messages in request",
        limit: CONSTANTS.MAX_CHAT_MESSAGES,
      },
      { status: 400, corsHeaders },
    );
  }

  const invalidMessage = body.messages.find(
    (message) => !message || typeof message !== "object",
  );
  if (invalidMessage) {
    console.error("Invalid message payload in request");
    return jsonResponse(
      { error: "Invalid message payload" },
      { status: 400, corsHeaders },
    );
  }

  const invalidRoleMessage = body.messages.find(
    (message) => !isValidRole(message.role),
  );
  if (invalidRoleMessage) {
    console.error("Invalid message role in request:", invalidRoleMessage?.role);
    return jsonResponse(
      {
        error: "Invalid message role",
        allowed_roles: ["user", "assistant", "system"],
      },
      { status: 400, corsHeaders },
    );
  }

  const invalidContentMessage = body.messages.find(
    (message) => !isNonEmptyString(message.content),
  );
  if (invalidContentMessage) {
    console.error("Invalid message content in request (empty or non-string)");
    return jsonResponse(
      { error: "Message content is required" },
      { status: 400, corsHeaders },
    );
  }

  const oversizedMessage = body.messages.find(
    (message) =>
      typeof message.content === "string" &&
      message.content.length > CONSTANTS.MAX_CHAT_MESSAGE_LENGTH,
  );
  if (oversizedMessage) {
    console.error(
      "Message content exceeds length limit",
      oversizedMessage.content.length,
    );
    return jsonResponse(
      {
        error: "Message content is too long",
        limit: CONSTANTS.MAX_CHAT_MESSAGE_LENGTH,
      },
      { status: 400, corsHeaders },
    );
  }

  if (!isValidWebSearchMode(body.enable_web_search)) {
    console.error("Invalid web search mode", body.enable_web_search);
    return jsonResponse(
      {
        error: "Invalid web search mode",
        allowed_values: ["auto", "on", "off"],
      },
      { status: 400, corsHeaders },
    );
  }

  if (body.temperature !== undefined) {
    if (
      typeof body.temperature !== "number" ||
      Number.isNaN(body.temperature)
    ) {
      console.error("Invalid temperature value", body.temperature);
      return jsonResponse(
        { error: "Temperature must be a number" },
        { status: 400, corsHeaders },
      );
    }
    if (body.temperature < 0 || body.temperature > 2) {
      console.error("Temperature outside supported range", body.temperature);
      return jsonResponse(
        { error: "Temperature must be between 0 and 2" },
        { status: 400, corsHeaders },
      );
    }
  }

  if (body.max_tokens !== undefined && !isPositiveInteger(body.max_tokens)) {
    console.error("Invalid max_tokens value", body.max_tokens);
    return jsonResponse(
      { error: "max_tokens must be a positive integer" },
      { status: 400, corsHeaders },
    );
  }

  if (
    body.image_data_url &&
    !isValidDataUrl(body.image_data_url, allowedImageTypes)
  ) {
    console.error("Invalid image data URL provided");
    return jsonResponse(
      { error: "Invalid image data URL" },
      { status: 400, corsHeaders },
    );
  }

  if (body.image_data_url && !modelCapabilities?.[body.model]?.supportsVision) {
    return jsonResponse(
      {
        error: "Selected model does not support vision",
        message: "Switch to a vision-capable model to analyze images",
      },
      { status: 400, corsHeaders },
    );
  }

  // Only use system prompt if client provides one
  let systemPrompt: string | null = null;
  if (body.system_prompt && typeof body.system_prompt === "string") {
    const trimmed = body.system_prompt.trim();
    if (trimmed.length > 0 && trimmed.length <= 4000) {
      systemPrompt = trimmed;
    }
  }

  const stream = body.stream !== false; // Default to streaming

  // For vision requests, convert the last user message to multipart content
  // format (text + image_url) as required by Venice's OpenAI-compatible API.
  const mappedMessages = body.messages.map((message, index) => {
    const isLastUserMessage =
      body.image_data_url &&
      index === body.messages.length - 1 &&
      message.role === "user";

    if (!isLastUserMessage) {
      return message;
    }

    // Handle case where content is already an array (from prior transformations)
    const existingContent = Array.isArray(message.content)
      ? message.content
      : [
          {
            type: "text" as const,
            text: normalizeTextContent(message.content),
          },
        ];

    return {
      ...message,
      content: [
        ...existingContent,
        { type: "image_url" as const, image_url: { url: body.image_data_url } },
      ],
    };
  });

  const messagesWithSystem = systemPrompt
    ? [{ role: "system" as const, content: systemPrompt }, ...mappedMessages]
    : mappedMessages;

  try {
    const veniceResponse = await fetch(
      `${CONSTANTS.VENICE_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: body.model,
          messages: messagesWithSystem,
          max_tokens: clampMaxTokens(
            body.max_tokens,
            CONSTANTS.DEFAULT_MAX_TOKENS,
          ),
          temperature: body.temperature ?? CONSTANTS.DEFAULT_TEMPERATURE,
          stream,
          venice_parameters: {
            enable_web_search: body.enable_web_search ?? "auto",
            enable_web_citations: true,
            include_search_results_in_stream: true,
          },
        }),
      },
    );

    if (!veniceResponse.ok) {
      const errorText = await veniceResponse.text();
      console.error("Venice API error:", veniceResponse.status, errorText);
      return jsonResponse(
        {
          error: "Venice API error",
          status: veniceResponse.status,
        },
        { status: veniceResponse.status, corsHeaders },
      );
    }

    const rateLimitHeaders = buildRateLimitHeaders(rateLimit);

    if (stream) {
      return new Response(veniceResponse.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          ...rateLimitHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const responseData = await veniceResponse.text();
    return new Response(responseData, {
      status: 200,
      headers: {
        ...corsHeaders,
        ...rateLimitHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    console.error("Failed to reach Venice API:", error instanceof Error ? error.message : "Unknown error");
    return jsonResponse(
      {
        error: "Failed to reach Venice API",
      },
      { status: 502, corsHeaders },
    );
  }
}

const normalizeTextContent = (value: unknown) => {
  if (typeof value !== "string") return " ";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : " ";
};
