// Venice AI Community Proxy - Info Endpoint
// Returns available models and rate limit information

const VENICE_BASE_URL = "https://api.venice.ai/api/v1";
const RATE_LIMIT = 20;

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
    // Extract model IDs from the response
    models = data.data
      .filter(model => model.type === "text")
      .map(model => model.id);
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
