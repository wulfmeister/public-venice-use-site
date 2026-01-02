// Venice AI Community Proxy - Chat Endpoint
// Vercel Serverless Function with Streaming Support

const VENICE_BASE_URL = "https://api.venice.ai/api/v1";

const ALLOWED_MODELS = [
  "llama-3.3-70b",
  "deepseek-r1-distill-llama-70b",
  "dolphin-2.9.2-qwen2-72b"
];

const RATE_LIMIT = 20;
const RATE_WINDOW = 3600000; // 1 hour in ms

// In-memory rate limiting (resets on cold start)
const rateLimitMap = new Map();

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-TOS-Accepted"
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

  // Only allow POST
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Check ToS acceptance
  const tosAccepted = request.headers.get("X-TOS-Accepted");
  if (tosAccepted !== "true") {
    return new Response(JSON.stringify({
      error: "Terms of Service not accepted",
      message: "You must include header: X-TOS-Accepted: true",
      tos_url: "/tos.html"
    }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Rate limiting
  const clientIP = request.headers.get("x-forwarded-for")?.split(",")[0] || 
                   request.headers.get("x-real-ip") || 
                   "unknown";
  const now = Date.now();
  const windowStart = now - RATE_WINDOW;
  
  let requests = rateLimitMap.get(clientIP) || [];
  requests = requests.filter(t => t > windowStart);
  
  if (requests.length >= RATE_LIMIT) {
    const retryAfter = Math.ceil((requests[0] + RATE_WINDOW - now) / 1000);
    return new Response(JSON.stringify({
      error: "Rate limit exceeded",
      limit: RATE_LIMIT,
      window: "1 hour",
      retry_after_seconds: retryAfter
    }), {
      status: 429,
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter)
      }
    });
  }
  
  requests.push(now);
  rateLimitMap.set(clientIP, requests);
  const remaining = RATE_LIMIT - requests.length;

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Validate model
  if (!body.model || !ALLOWED_MODELS.includes(body.model)) {
    return new Response(JSON.stringify({
      error: "Invalid or disallowed model",
      allowed_models: ALLOWED_MODELS
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Validate messages
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({
      error: "Messages array is required"
    }), {
      status: 400,
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

  // Determine if streaming is requested
  const stream = body.stream !== false; // Default to streaming

  // Forward to Venice API
  try {
    const veniceResponse = await fetch(`${VENICE_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: body.model,
        messages: body.messages,
        max_tokens: Math.min(body.max_tokens || 2048, 4096),
        temperature: body.temperature ?? 0.7,
        stream: stream
      })
    });

    if (!veniceResponse.ok) {
      const errorText = await veniceResponse.text();
      return new Response(JSON.stringify({
        error: "Venice API error",
        status: veniceResponse.status,
        details: errorText
      }), {
        status: veniceResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // For streaming responses, pipe through directly
    if (stream) {
      return new Response(veniceResponse.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Limit": String(RATE_LIMIT)
        }
      });
    }

    // For non-streaming, return JSON
    const responseData = await veniceResponse.text();
    return new Response(responseData, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Limit": String(RATE_LIMIT)
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: "Failed to reach Venice API",
      details: error.message
    }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
