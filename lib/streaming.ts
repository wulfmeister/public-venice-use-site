import { Citation, StreamingChunk } from "./types";

export interface StreamingCallbacks {
  onContent: (content: string) => void;
  onCitations: (citations: Record<string, Citation>) => void;
}

export interface StreamingResult {
  content: string;
  citations: Record<string, Citation>;
}

interface RawCitation {
  url?: string;
  title?: string;
  snippet?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export const normalizeCitations = (
  rawCitations: RawCitation[],
  target: Record<string, Citation>,
) => {
  rawCitations.forEach((citation, index) => {
    const metadata = citation.metadata as Record<string, unknown> | undefined;
    target[index] = {
      id: String(index),
      url: citation.url || (metadata?.url as string | undefined),
      title:
        citation.title ||
        (metadata?.title as string | undefined) ||
        `Source ${index + 1}`,
      snippet: citation.snippet || citation.description || "",
      metadata: metadata || (citation as unknown as Record<string, unknown>),
    };
  });
};

export const parseStreamingResponse = async (
  response: Response,
  callbacks: StreamingCallbacks,
  options?: { signal?: AbortSignal },
): Promise<StreamingResult> => {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";
  const citationDocuments: Record<string, Citation> = {};

  const onAbort = () => reader.cancel();
  options?.signal?.addEventListener("abort", onAbort);

  const streamTimeout = 30000;
  const readWithTimeout = async () =>
    new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reader.cancel().catch(() => {});
        reject(new Error("Stream timeout: no data received for 30 seconds"));
      }, streamTimeout);

      reader.read().then(
        (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
      );
    });

  try {
    while (true) {
      if (options?.signal?.aborted) break;

      const { done, value } = await readWithTimeout();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let hasContentUpdate = false;
      let hasCitationUpdate = false;

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine.startsWith("data: ")) continue;

        const data = trimmedLine.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data) as StreamingChunk;
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            hasContentUpdate = true;
          }

          if (parsed.venice_parameters?.web_search_citations) {
            const citationsPayload =
              parsed.venice_parameters.web_search_citations;
            if (Array.isArray(citationsPayload)) {
              normalizeCitations(citationsPayload, citationDocuments);
              hasCitationUpdate = true;
            }
          }
        } catch (error) {
          console.warn("Failed to parse streaming data:", data, error);
        }
      }

      if (hasContentUpdate) {
        callbacks.onContent(fullContent);
      }
      if (hasCitationUpdate) {
        callbacks.onCitations(citationDocuments);
      }
    }

    if (buffer.trim()) {
      console.warn(
        "Stream ended with incomplete data in buffer:",
        buffer.slice(0, 100),
      );
    }
  } finally {
    options?.signal?.removeEventListener("abort", onAbort);
    reader.cancel().catch(() => {});
  }

  return {
    content: fullContent,
    citations: citationDocuments,
  };
};
