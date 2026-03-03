import { NextRequest } from "next/server";
import { CONSTANTS } from "@/lib/constants";
import {
  createCorsHeaders,
  ensureApiKey,
  ensureDeploymentPassword,
  ensureTosAccepted,
  handleOptions,
  jsonResponse,
} from "@/lib/api-utils";

const corsHeaders = createCorsHeaders(["GET", "OPTIONS"]);

export async function OPTIONS() {
  return handleOptions(corsHeaders);
}

export async function GET(request: NextRequest) {
  const tosResult = ensureTosAccepted(request, corsHeaders);
  if (tosResult) return tosResult;

  const passwordResult = ensureDeploymentPassword(request, corsHeaders);
  if (passwordResult) return passwordResult;

  const apiKeyResult = ensureApiKey(corsHeaders);
  if (apiKeyResult.error) return apiKeyResult.error;
  const apiKey = apiKeyResult.apiKey;

  try {
    const response = await fetch(
      `${CONSTANTS.VENICE_BASE_URL}/billing/balance`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    if (response.ok) {
      const data = await response.json();
      return jsonResponse(data, { corsHeaders });
    } else {
      return jsonResponse(
        { error: "Unable to fetch balance" },
        { status: 502, corsHeaders },
      );
    }
  } catch {
    return jsonResponse(
      { error: "Unable to fetch balance" },
      { status: 502, corsHeaders },
    );
  }
}
