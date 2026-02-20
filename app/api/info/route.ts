// Info Endpoint - Returns available models and rate limit information

import { CONSTANTS } from "@/lib/constants";
import {
  createCorsHeaders,
  ensureApiKey,
  handleOptions,
  jsonResponse,
} from "@/lib/api-utils";
import { fetchTextModels, VeniceModelItem } from "@/lib/venice-models";
import { InfoResponse } from "@/lib/types";

const corsHeaders = createCorsHeaders(["GET", "OPTIONS"]);

export async function OPTIONS() {
  return handleOptions(corsHeaders);
}

export async function GET() {
  const apiKeyResult = ensureApiKey(corsHeaders);
  if (apiKeyResult.error) return apiKeyResult.error;
  const apiKey = apiKeyResult.apiKey;

  let imageModels: string[] = [];

  try {
    const [imageResponse, upscaleResponse] = await Promise.all([
      fetch(`${CONSTANTS.VENICE_BASE_URL}/models?type=image`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }),
      fetch(`${CONSTANTS.VENICE_BASE_URL}/models?type=upscale`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }),
    ]);

    const allowedImageModels: Set<string> = new Set(CONSTANTS.IMAGE_MODELS);

    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      imageModels = imageData.data
        .filter(
          (model: VeniceModelItem) =>
            model.type === "image" && allowedImageModels.has(model.id),
        )
        .map((model: VeniceModelItem) => model.id);
    }

    if (upscaleResponse.ok) {
      const upscaleData = await upscaleResponse.json();
      const upscaleModels = upscaleData.data
        .filter(
          (model: VeniceModelItem) =>
            model.type === "upscale" && allowedImageModels.has(model.id),
        )
        .map((model: VeniceModelItem) => model.id);
      imageModels = [...imageModels, ...upscaleModels];
    }

    if (imageModels.length === 0) {
      imageModels = [...CONSTANTS.IMAGE_MODELS];
    }
  } catch {
    imageModels = [...CONSTANTS.IMAGE_MODELS];
  }

  const { allowedModels, modelCapabilities, blockedModels } =
    await fetchTextModels(apiKey);

  const payload: InfoResponse = {
    name: "OpenChat",
    version: "1.0.0",
    models: allowedModels,
    image_models: imageModels,
    model_capabilities: modelCapabilities,
    rate_limit: {
      requests: CONSTANTS.RATE_LIMIT,
      window: "1 hour",
      per: "IP address",
    },
    pricing_filter: {
      max_input_price: CONSTANTS.MAX_INPUT_PRICE,
      max_output_price: CONSTANTS.MAX_OUTPUT_PRICE,
      blocked_models: blockedModels,
    },
    endpoints: {
      chat: "/api/chat",
      info: "/api/info",
    },
    usage: {
      required_header: "X-TOS-Accepted: true",
      tos_url: "/tos.html",
    },
    password_required: !!process.env.DEPLOYMENT_PASSWORD,
  };

  return jsonResponse(payload, { corsHeaders });
}
