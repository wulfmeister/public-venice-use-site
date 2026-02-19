import { ChatMessage } from './types';

interface ChatRequestOptions {
  model: string;
  messages: ChatMessage[];
  webSearchEnabled?: boolean;
  imageDataUrl?: string;
  systemPrompt?: string;
  signal?: AbortSignal;
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
  signal
}: ChatRequestOptions) => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-TOS-Accepted': 'true'
    },
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
