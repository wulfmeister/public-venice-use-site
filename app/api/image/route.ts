import type { NextRequest } from "next/server";
import { CONSTANTS } from "@/lib/constants";
import {
  applyImageRateLimit,
  createCorsHeaders,
  ensureApiKey,
  ensureTosAccepted,
  handleOptions,
  jsonResponse,
  parseJsonBody,
} from "@/lib/api-utils";
import { isNonEmptyString } from "@/lib/validation";

const corsHeaders = createCorsHeaders(["POST", "OPTIONS"]);
const allowedFormats = ["png", "jpeg", "jpg", "webp"];
const MIN_IMAGE_DIMENSION = 64;
const MAX_IMAGE_DIMENSION = 2048;

export async function OPTIONS() {
  return handleOptions(corsHeaders);
}

export async function POST(request: NextRequest) {
  const tosError = ensureTosAccepted(request, corsHeaders);
  if (tosError) return tosError;

  const rateLimitResult = applyImageRateLimit(request, corsHeaders);
  if (rateLimitResult.error) return rateLimitResult.error;

  type ImageRequestBody = {
    prompt?: string;
    size?: string;
    model?: string;
    format?: string;
  };

  const parsedBody = await parseJsonBody<ImageRequestBody>(
    request,
    corsHeaders,
  );
  if (parsedBody.error) return parsedBody.error;
  const body = parsedBody.body;

  const prompt = (body.prompt || "").trim();
  if (!isNonEmptyString(prompt)) {
    return jsonResponse(
      { error: "Prompt is required" },
      { status: 400, corsHeaders },
    );
  }

  if (prompt.length > CONSTANTS.MAX_CHAT_MESSAGE_LENGTH) {
    return jsonResponse(
      { error: "Prompt is too long", limit: CONSTANTS.MAX_CHAT_MESSAGE_LENGTH },
      { status: 400, corsHeaders },
    );
  }

  const model = body.model || CONSTANTS.DEFAULT_IMAGE_MODEL;
  if (!(CONSTANTS.IMAGE_MODELS as readonly string[]).includes(model)) {
    return jsonResponse(
      {
        error: "Invalid image model",
        allowed_models: CONSTANTS.IMAGE_MODELS,
      },
      { status: 400, corsHeaders },
    );
  }

  const size = body.size || CONSTANTS.DEFAULT_IMAGE_SIZE;
  if (!/^\d+x\d+$/i.test(size)) {
    return jsonResponse(
      { error: "Invalid image size format" },
      { status: 400, corsHeaders },
    );
  }

  const [width, height] = size.split("x").map(Number);
  if (
    width < MIN_IMAGE_DIMENSION ||
    width > MAX_IMAGE_DIMENSION ||
    height < MIN_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION
  ) {
    return jsonResponse(
      {
        error: "Image dimensions out of bounds",
        min: MIN_IMAGE_DIMENSION,
        max: MAX_IMAGE_DIMENSION,
      },
      { status: 400, corsHeaders },
    );
  }

  const requestedFormat = (
    body.format || CONSTANTS.DEFAULT_IMAGE_FORMAT
  ).toLowerCase();
  if (!allowedFormats.includes(requestedFormat)) {
    return jsonResponse(
      {
        error: "Invalid image format",
        allowed_formats: allowedFormats,
      },
      { status: 400, corsHeaders },
    );
  }
  const outputFormat = requestedFormat === "jpg" ? "jpeg" : requestedFormat;

  const apiKeyResult = ensureApiKey(corsHeaders);
  if (apiKeyResult.error) return apiKeyResult.error;
  const apiKey = apiKeyResult.apiKey;

  try {
    const imageResponse = await fetch(
      `${CONSTANTS.VENICE_BASE_URL}/images/generations`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          model,
          size,
          output_format: outputFormat,
          response_format: "b64_json",
          n: 1,
          moderation: "auto",
        }),
      },
    );

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error("Venice image API error:", imageResponse.status, errorText);
      return jsonResponse(
        {
          error: "Venice image API error",
          status: imageResponse.status,
        },
        { status: imageResponse.status, corsHeaders },
      );
    }

    const payload = await imageResponse.json();
    const imageBase64 = payload?.data?.[0]?.b64_json;
    if (!imageBase64) {
      return jsonResponse(
        { error: "No image data returned" },
        { status: 502, corsHeaders },
      );
    }

    const mime = `image/${outputFormat}`;
    const imageDataUrl = `data:${mime};base64,${imageBase64}`;

    return jsonResponse(
      {
        image_data_url: imageDataUrl,
        mime,
      },
      { corsHeaders },
    );
  } catch (error: unknown) {
    console.error("Failed to reach Venice image API:", error instanceof Error ? error.message : "Unknown error");
    return jsonResponse(
      {
        error: "Failed to reach Venice image API",
      },
      { status: 502, corsHeaders },
    );
  }
}
