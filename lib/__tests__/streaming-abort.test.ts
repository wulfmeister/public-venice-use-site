import { describe, it, expect, vi } from 'vitest';
import { parseStreamingResponse } from '../streaming';

function createSlowSSEResponse(chunks: string[], delayMs = 50): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        await new Promise((r) => setTimeout(r, delayMs));
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream);
}

describe('parseStreamingResponse abort', () => {
  it('stops streaming when abort signal fires and preserves partial content', async () => {
    const controller = new AbortController();

    // Slow stream: each chunk delayed 50ms
    const response = createSlowSSEResponse(
      [
        'data: {"choices":[{"index":0,"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"index":0,"delta":{"content":" beautiful"}}]}\n\n',
        'data: {"choices":[{"index":0,"delta":{"content":" world"}}]}\n\n',
        'data: [DONE]\n\n',
      ],
      50,
    );

    const onContent = vi.fn();
    const onCitations = vi.fn();

    // Abort after ~80ms — should get first chunk, maybe second, but not all
    setTimeout(() => controller.abort(), 80);

    const result = await parseStreamingResponse(
      response,
      { onContent, onCitations },
      { signal: controller.signal },
    );

    // Should have partial content (at least "Hello") but not the full message
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content.length).toBeLessThan('Hello beautiful world'.length);
  });

  it('returns immediately when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(); // pre-aborted

    const response = createSlowSSEResponse([
      'data: {"choices":[{"index":0,"delta":{"content":"Never"}}]}\n\n',
      'data: [DONE]\n\n',
    ]);

    const result = await parseStreamingResponse(
      response,
      { onContent: vi.fn(), onCitations: vi.fn() },
      { signal: controller.signal },
    );

    expect(result.content).toBe('');
  });

  it('completes normally when signal is never aborted', async () => {
    const controller = new AbortController();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(ctrl) {
        ctrl.enqueue(
          encoder.encode(
            'data: {"choices":[{"index":0,"delta":{"content":"Full"}}]}\n\n',
          ),
        );
        ctrl.enqueue(
          encoder.encode(
            'data: {"choices":[{"index":0,"delta":{"content":" response"}}]}\n\n',
          ),
        );
        ctrl.enqueue(encoder.encode('data: [DONE]\n\n'));
        ctrl.close();
      },
    });
    const response = new Response(stream);

    const result = await parseStreamingResponse(
      response,
      { onContent: vi.fn(), onCitations: vi.fn() },
      { signal: controller.signal },
    );

    expect(result.content).toBe('Full response');
  });
});
