import { ChatMessage } from './types';

interface ChatRequestOptions {
  model: string;
  messages: ChatMessage[];
  webSearchEnabled?: boolean;
  imageDataUrl?: string;
  systemPrompt?: string;
  signal?: AbortSignal;
  deploymentPassword?: string;
}

export const readErrorDetails = async (response: Response) => {
  let errorDetails = '';
  try {
    const errorText = await response.text();
    errorDetails = errorText ? ` - ${errorText}` : '';
  } catch (readError) {
    console.error('Failed to read error response:', readError);
  }

  throw new Error(`Request failed: ${response.status}${errorDetails}`);
};

export const sendChatRequest = async ({
  model,
  messages,
  webSearchEnabled,
  imageDataUrl,
  systemPrompt,
  signal,
  deploymentPassword
}: ChatRequestOptions) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-TOS-Accepted': 'true'
  };
  if (deploymentPassword) {
    headers['X-Deployment-Password'] = deploymentPassword;
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      enable_web_search: webSearchEnabled ? 'auto' : 'off',
      ...(imageDataUrl ? { image_data_url: imageDataUrl } : {}),
      ...(systemPrompt ? { system_prompt: systemPrompt } : {})
    })
  });

  if (!response.ok) {
    await readErrorDetails(response.clone());
  }

  return response;
};
