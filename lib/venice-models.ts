import { CONSTANTS } from "./constants";

export interface VeniceModelCapabilities {
  supportsWebSearch: boolean;
  supportsFunctionCalling: boolean;
  supportsVision: boolean;
  supportsReasoning: boolean;
}

export interface VeniceBlockedModel {
  id: string;
  name: string;
  inputPrice: number;
  outputPrice: number;
  reason: string;
}

export interface VeniceModelItem {
  id: string;
  type: string;
  model_spec?: {
    name?: string;
    pricing?: {
      input?: { usd?: number };
      output?: { usd?: number };
    };
    capabilities?: {
      supportsWebSearch?: boolean;
      supportsFunctionCalling?: boolean;
      supportsVision?: boolean;
      supportsReasoning?: boolean;
    };
  };
}

export interface VeniceTextModelsResult {
  allowedModels: string[];
  modelCapabilities: Record<string, VeniceModelCapabilities>;
  blockedModels: VeniceBlockedModel[];
}

const FALLBACK_TEXT_MODELS = [
  CONSTANTS.DEFAULT_MODEL,
  "llama-3.3-70b",
  "deepseek-r1-distill-llama-70b",
  "dolphin-2.9.2-qwen2-72b",
];

const FALLBACK_CAPABILITIES: Record<string, VeniceModelCapabilities> = {
  [CONSTANTS.DEFAULT_MODEL]: {
    supportsWebSearch: true,
    supportsFunctionCalling: true,
    supportsVision: false,
    supportsReasoning: true,
  },
  "llama-3.3-70b": {
    supportsWebSearch: true,
    supportsFunctionCalling: true,
    supportsVision: false,
    supportsReasoning: false,
  },
  "deepseek-r1-distill-llama-70b": {
    supportsWebSearch: true,
    supportsFunctionCalling: true,
    supportsVision: false,
    supportsReasoning: true,
  },
  "dolphin-2.9.2-qwen2-72b": {
    supportsWebSearch: true,
    supportsFunctionCalling: true,
    supportsVision: false,
    supportsReasoning: false,
  },
};

// In-memory cache avoids hitting Venice /models on every request.
// Shared across all requests within a single serverless invocation.
let cachedTextModels: VeniceTextModelsResult | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const isCacheValid = () => {
  if (!cachedTextModels) return false;
  return Date.now() - cacheTimestamp < CACHE_TTL;
};

const ensureDefaultModel = (result: VeniceTextModelsResult) => {
  if (!result.allowedModels.includes(CONSTANTS.DEFAULT_MODEL)) {
    result.allowedModels.unshift(CONSTANTS.DEFAULT_MODEL);
  }
  if (!result.modelCapabilities[CONSTANTS.DEFAULT_MODEL]) {
    result.modelCapabilities[CONSTANTS.DEFAULT_MODEL] =
      FALLBACK_CAPABILITIES[CONSTANTS.DEFAULT_MODEL];
  }
};

export const fetchTextModels = async (
  apiKey: string,
): Promise<VeniceTextModelsResult> => {
  if (isCacheValid()) return cachedTextModels!;

  try {
    const response = await fetch(
      `${CONSTANTS.VENICE_BASE_URL}/models?type=text`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Venice API error: ${response.status}`);
    }

    const data = await response.json();
    const allModels: VeniceModelItem[] = (data.data || []).filter(
      (model: VeniceModelItem) => model.type === "text",
    );

    const allowedModels: string[] = [];
    const blockedModels: VeniceBlockedModel[] = [];
    const modelCapabilities: Record<string, VeniceModelCapabilities> = {};

    // Filter models by price thresholds to keep proxy costs predictable.
    // The default model always passes regardless of price.
    for (const model of allModels) {
      const pricing = model.model_spec?.pricing;
      const capabilities = model.model_spec?.capabilities || {};

      modelCapabilities[model.id] = {
        supportsWebSearch: capabilities.supportsWebSearch || false,
        supportsFunctionCalling: capabilities.supportsFunctionCalling || false,
        supportsVision: capabilities.supportsVision || false,
        supportsReasoning: capabilities.supportsReasoning || false,
      };

      if (model.id === CONSTANTS.DEFAULT_MODEL) {
        if (!allowedModels.includes(model.id)) {
          allowedModels.push(model.id);
        }
        continue;
      }

      if (pricing) {
        const inputPrice = pricing.input?.usd || 0;
        const outputPrice = pricing.output?.usd || 0;

        if (
          inputPrice <= CONSTANTS.MAX_INPUT_PRICE &&
          outputPrice <= CONSTANTS.MAX_OUTPUT_PRICE
        ) {
          allowedModels.push(model.id);
        } else {
          blockedModels.push({
            id: model.id,
            name: model.model_spec?.name || model.id,
            inputPrice,
            outputPrice,
            reason: "Exceeds price threshold",
          });
        }
      } else {
        allowedModels.push(model.id);
      }
    }

    const result: VeniceTextModelsResult = {
      allowedModels,
      modelCapabilities,
      blockedModels,
    };

    ensureDefaultModel(result);
    cachedTextModels = result;
    cacheTimestamp = Date.now();
    return result;
  } catch {
    const fallbackResult: VeniceTextModelsResult = {
      allowedModels: FALLBACK_TEXT_MODELS.filter(
        (model, index, array) => array.indexOf(model) === index,
      ),
      modelCapabilities: { ...FALLBACK_CAPABILITIES },
      blockedModels: [],
    };

    ensureDefaultModel(fallbackResult);
    cachedTextModels = fallbackResult;
    cacheTimestamp = Date.now();
    return fallbackResult;
  }
};
