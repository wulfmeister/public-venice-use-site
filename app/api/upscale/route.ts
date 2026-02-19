import type { NextRequest } from "next/server";
import { CONSTANTS } from "@/lib/constants";
import {
  applyUpscaleRateLimit,
  createCorsHeaders,
  ensureApiKey,
  ensureTosAccepted,
  handleOptions,
  jsonResponse,
  parseImageScale,
  parseJsonBody,
} from "@/lib/api-utils";
import { isValidDataUrl } from "@/lib/validation";

export const runtime = "nodejs";

const corsHeaders = createCorsHeaders(["POST", "OPTIONS"]);
const allowedImageTypes = ["image/png", "image/jpeg", "image/webp"];

export async function OPTIONS() {
  return handleOptions(corsHeaders);
}

export async function POST(request: NextRequest) {
  const tosError = ensureTosAccepted(request, corsHeaders);
  if (tosError) return tosError;

  const rateLimitResult = applyUpscaleRateLimit(request, corsHeaders);
  if (rateLimitResult.error) return rateLimitResult.error;

  type UpscaleRequestBody = {
    image_data_url?: string;
    scale?: number;
    enhance?: boolean;
  };

  const parsedBody = await parseJsonBody<UpscaleRequestBody>(
    request,
    corsHeaders,
  );
  if (parsedBody.error) return parsedBody.error;
  const body = parsedBody.body;

  const imageDataUrl = body.image_data_url;
  if (!imageDataUrl) {
    return jsonResponse(
      { error: "image_data_url is required" },
      { status: 400, corsHeaders },
    );
  }

  if (!isValidDataUrl(imageDataUrl, allowedImageTypes)) {
    return jsonResponse(
      { error: "Invalid image data URL" },
      { status: 400, corsHeaders },
    );
  }

  const scale = parseImageScale(body.scale, 2);
  if (scale < 1 || scale > CONSTANTS.MAX_UPSCALE_SCALE) {
    return jsonResponse(
      {
        error: "Invalid upscale scale",
        allowed_range: [1, CONSTANTS.MAX_UPSCALE_SCALE],
      },
      { status: 400, corsHeaders },
    );
  }

  const [, base64] = imageDataUrl.split(",");
  if (!base64) {
    return jsonResponse(
      { error: "Invalid image data" },
      { status: 400, corsHeaders },
    );
  }

  const apiKeyResult = ensureApiKey(corsHeaders);
  if (apiKeyResult.error) return apiKeyResult.error;
  const apiKey = apiKeyResult.apiKey;

  try {
    const upscaleResponse = await fetch(
      `${CONSTANTS.VENICE_BASE_URL}/image/upscale`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64,
          scale,
          enhance: body.enhance ?? true,
        }),
      },
    );

    if (!upscaleResponse.ok) {
      const errorText = await upscaleResponse.text();
      console.error("Venice upscale API error:", upscaleResponse.status, errorText);
      return jsonResponse(
        {
          error: "Venice upscale API error",
          status: upscaleResponse.status,
        },
        { status: upscaleResponse.status, corsHeaders },
      );
    }

    const arrayBuffer = await upscaleResponse.arrayBuffer();
    const mime = upscaleResponse.headers.get("content-type") || "image/png";
    const imageBase64 = Buffer.from(arrayBuffer).toString("base64");
    const imageData = `data:${mime};base64,${imageBase64}`;

    return jsonResponse(
      {
        image_data_url: imageData,
        mime,
      },
      { corsHeaders },
    );
  } catch (error: unknown) {
    console.error("Failed to reach Venice upscale API:", error instanceof Error ? error.message : "Unknown error");
    return jsonResponse(
      {
        error: "Failed to reach Venice upscale API",
      },
      { status: 502, corsHeaders },
    );
  }
}
