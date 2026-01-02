// Venice AI Community Proxy - Info Endpoint
// Returns available models and rate limit information

const VENICE_BASE_URL = "https://api.venice.ai/api/v1";
const RATE_LIMIT = 20;

// Price thresholds per 1M tokens (USD)
const MAX_INPUT_PRICE = 2.0;   // $2.00 per 1M input tokens
const MAX_OUTPUT_PRICE = 6.0;  // $6.00 per 1M output tokens

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  // Only allow GET
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Check for API key
  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: "Server configuration error",
      message: "Venice API key not configured"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Fetch available models from Venice API
  let models = [];
  let blockedModels = [];
  try {
    const response = await fetch(`${VENICE_BASE_URL}/models?type=text`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Venice API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter models by price threshold
    const allModels = data.data.filter(model => model.type === "text");
    
    for (const model of allModels) {
      const pricing = model.model_spec?.pricing;
      if (pricing) {
        const inputPrice = pricing.input?.usd || 0;
        const outputPrice = pricing.output?.usd || 0;
        
        if (inputPrice <= MAX_INPUT_PRICE && outputPrice <= MAX_OUTPUT_PRICE) {
          models.push(model.id);
        } else {
          blockedModels.push({
            id: model.id,
            name: model.model_spec?.name || model.id,
            inputPrice: inputPrice,
            outputPrice: outputPrice,
            reason: "Exceeds price threshold"
          });
        }
      } else {
        // If no pricing info, include by default (likely free/cheap)
        models.push(model.id);
      }
    }
  } catch (error) {
    // Fallback to hardcoded models if API call fails
    models = [
      "llama-3.3-70b",
      "deepseek-r1-distill-llama-70b", 
      "dolphin-2.9.2-qwen2-72b"
    ];
  }

  return new Response(JSON.stringify({
    name: "Venice AI Community Proxy",
    version: "1.0.0",
    models: models,
    rate_limit: {
      requests: RATE_LIMIT,
      window: "1 hour",
      per: "IP address"
    },
    pricing_filter: {
      max_input_price: MAX_INPUT_PRICE,
      max_output_price: MAX_OUTPUT_PRICE,
      blocked_models: blockedModels
    },
    endpoints: {
      chat: "/api/chat",
      info: "/api/info"
    },
    usage: {
      required_header: "X-TOS-Accepted: true",
      tos_url: "/tos.html"
    }
  }, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
