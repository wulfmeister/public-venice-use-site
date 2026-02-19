import { describe, it, expect, vi } from 'vitest';
import { normalizeCitations, parseStreamingResponse } from '../streaming';
import type { Citation } from '../types';

describe('normalizeCitations', () => {
  it('normalizes citation data into target object', () => {
    const target: Record<string, Citation> = {};
    const raw = [
      { url: 'https://a.com', title: 'Source A', snippet: 'text' },
      { metadata: { url: 'https://b.com', title: 'Source B' }, description: 'desc' }
    ];

    normalizeCitations(raw, target);

    expect(target[0]).toEqual({
      id: '0',
      url: 'https://a.com',
      title: 'Source A',
      snippet: 'text',
      metadata: { url: 'https://a.com', title: 'Source A', snippet: 'text' }
    });
    expect(target[1].url).toBe('https://b.com');
    expect(target[1].snippet).toBe('desc');
  });

  it('handles empty arrays', () => {
    const target: Record<string, Citation> = {};
    normalizeCitations([], target);
    expect(Object.keys(target)).toHaveLength(0);
  });
});

describe('parseStreamingResponse', () => {
  function createMockSSEResponse(chunks: string[]): Response {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      }
    });

    return new Response(stream);
  }

  it('parses streaming content chunks', async () => {
    const response = createMockSSEResponse([
      'data: {"choices":[{"index":0,"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"index":0,"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n'
    ]);

    const onContent = vi.fn();
    const onCitations = vi.fn();

    const result = await parseStreamingResponse(response, { onContent, onCitations });

    expect(result.content).toBe('Hello world');
    expect(onContent).toHaveBeenCalledTimes(2);
    expect(onContent).toHaveBeenLastCalledWith('Hello world');
  });

  it('parses web search citations from stream', async () => {
    const response = createMockSSEResponse([
      'data: {"choices":[{"index":0,"delta":{"content":"Answer"}}],"venice_parameters":{"web_search_citations":[{"url":"https://example.com","title":"Example"}]}}\n\n',
      'data: [DONE]\n\n'
    ]);

    const onContent = vi.fn();
    const onCitations = vi.fn();

    const result = await parseStreamingResponse(response, { onContent, onCitations });

    expect(result.content).toBe('Answer');
    expect(onCitations).toHaveBeenCalled();
    expect(result.citations[0]).toBeDefined();
    expect(result.citations[0].url).toBe('https://example.com');
  });

  it('handles empty stream', async () => {
    const response = createMockSSEResponse(['data: [DONE]\n\n']);

    const result = await parseStreamingResponse(response, {
      onContent: vi.fn(),
      onCitations: vi.fn()
    });

    expect(result.content).toBe('');
    expect(Object.keys(result.citations)).toHaveLength(0);
  });

  it('skips malformed data lines', async () => {
    const response = createMockSSEResponse([
      'data: {"choices":[{"index":0,"delta":{"content":"OK"}}]}\n\n',
      'data: {INVALID JSON}\n\n',
      'data: [DONE]\n\n'
    ]);

    const result = await parseStreamingResponse(response, {
      onContent: vi.fn(),
      onCitations: vi.fn()
    });

    expect(result.content).toBe('OK');
  });
});
