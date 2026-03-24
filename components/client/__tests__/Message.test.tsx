import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { Message as MessageType } from '@/lib/types';
import { formatMessage } from '@/lib/markdown';
import { getImageBlob } from '@/lib/image-store';

vi.mock('@/lib/markdown', () => ({
  formatMessage: vi.fn((content: string) => `<p>${content}</p>`),
  escapeHtml: vi.fn((s: string) => s),
}));

vi.mock('@/lib/validation', () => ({
  isValidUrl: vi.fn(() => true),
}));

vi.mock('@/lib/image-store', () => ({
  getImageBlob: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('isomorphic-dompurify', () => ({
  default: {
    sanitize: vi.fn((html: string) => html),
  },
}));

// Mock Prism
vi.mock('prismjs', () => ({
  default: { highlightAllUnder: vi.fn() },
}));

// Mock all prismjs language imports
vi.mock('prismjs/components/prism-javascript', () => ({}));
vi.mock('prismjs/components/prism-typescript', () => ({}));
vi.mock('prismjs/components/prism-python', () => ({}));
vi.mock('prismjs/components/prism-css', () => ({}));
vi.mock('prismjs/components/prism-bash', () => ({}));
vi.mock('prismjs/components/prism-json', () => ({}));
vi.mock('prismjs/components/prism-jsx', () => ({}));
vi.mock('prismjs/components/prism-tsx', () => ({}));
vi.mock('prismjs/components/prism-rust', () => ({}));
vi.mock('prismjs/components/prism-go', () => ({}));
vi.mock('prismjs/components/prism-sql', () => ({}));
vi.mock('prismjs/components/prism-yaml', () => ({}));
vi.mock('prismjs/components/prism-markdown', () => ({}));
vi.mock('prismjs/components/prism-java', () => ({}));
vi.mock('prismjs/components/prism-c', () => ({}));
vi.mock('prismjs/components/prism-cpp', () => ({}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Bot: () => <span data-testid="bot-icon" />,
  User: () => <span data-testid="user-icon" />,
  Copy: () => <span data-testid="copy-icon" />,
  Check: () => <span data-testid="check-icon" />,
  RefreshCw: () => <span data-testid="refresh-icon" />,
  Square: () => <span data-testid="square-icon" />,
}));

import Message from '../Message';

Object.assign(navigator, {
  clipboard: { writeText: vi.fn(() => Promise.resolve()) },
});

describe('Message', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const userMessage: MessageType = {
    id: 'user-1',
    role: 'user',
    content: 'Hello world',
  };

  const assistantMessage: MessageType = {
    id: 'assistant-1',
    role: 'assistant',
    content: 'Hello from assistant',
  };

  const thinkingMessage: MessageType = {
    id: 'thinking-1',
    role: 'assistant',
    content: 'Thinking...',
  };

  it('renders user message with user icon', () => {
    render(<Message message={userMessage} />);
    expect(screen.getByTestId('user-icon')).toBeInTheDocument();
  });

  it('renders assistant message with bot icon', () => {
    render(<Message message={assistantMessage} />);
    expect(screen.getByTestId('bot-icon')).toBeInTheDocument();
  });

  it('shows skeleton when content is "Thinking..."', () => {
    const { container } = render(<Message message={thinkingMessage} />);
    const skeletonBars = container.querySelectorAll('.skeleton-bar');
    expect(skeletonBars.length).toBeGreaterThan(0);
  });

  it('shows stop button during thinking state', () => {
    render(<Message message={thinkingMessage} />);
    const stopButton = screen.getByRole('button', { name: /stop generating/i });
    expect(stopButton).toBeInTheDocument();
  });

  it('stop button dispatches stopGenerating event', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    render(<Message message={thinkingMessage} />);
    const stopButton = screen.getByRole('button', { name: /stop generating/i });
    fireEvent.click(stopButton);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    const event = dispatchSpy.mock.calls.find(
      (call) => (call[0] as CustomEvent).type === 'stopGenerating'
    );
    expect(event).toBeDefined();
    dispatchSpy.mockRestore();
  });

  it('copy button calls clipboard.writeText', async () => {
    render(<Message message={assistantMessage} />);
    const copyButton = screen.getByRole('button', { name: /copy message/i });
    fireEvent.click(copyButton);
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello from assistant');
    });
  });

  it('regenerate button shown only when isLast=true', () => {
    const { rerender } = render(<Message message={assistantMessage} isLast={false} />);
    expect(screen.queryByRole('button', { name: /regenerate response/i })).not.toBeInTheDocument();

    rerender(<Message message={assistantMessage} isLast={true} />);
    expect(screen.getByRole('button', { name: /regenerate response/i })).toBeInTheDocument();
  });

  it('regenerate button dispatches regenerateLastAssistant event', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    render(<Message message={assistantMessage} isLast={true} />);
    const regenButton = screen.getByRole('button', { name: /regenerate response/i });
    fireEvent.click(regenButton);
    const event = dispatchSpy.mock.calls.find(
      (call) => (call[0] as CustomEvent).type === 'regenerateLastAssistant'
    );
    expect(event).toBeDefined();
    dispatchSpy.mockRestore();
  });

  it('displays image when imageDataUrl is present', () => {
    const msgWithImage: MessageType = {
      id: 'user-img',
      role: 'user',
      content: 'Check this image',
      imageDataUrl: 'data:image/png;base64,abc123',
      imageName: 'test.png',
    };
    render(<Message message={msgWithImage} />);
    const img = screen.getByAltText('test.png') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toBe('data:image/png;base64,abc123');
  });

  it('calls formatMessage with content and citations', () => {
    const citations = {
      0: { title: 'Source 1', url: 'https://example.com' },
    };
    const msgWithCitations: MessageType = {
      id: 'assist-cite',
      role: 'assistant',
      content: 'Here is info [0]',
      citations,
    };
    render(<Message message={msgWithCitations} />);
    expect(formatMessage).toHaveBeenCalledWith('Here is info [0]', citations);
  });
});
