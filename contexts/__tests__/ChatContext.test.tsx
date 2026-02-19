import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ChatProvider, useChat } from '../ChatContext';
import { ToastProvider } from '../ToastContext';

// Mock dependencies
vi.mock('@/lib/storage', () => ({
  conversationsStorage: {
    get: () => ({}),
    set: vi.fn(),
    getCurrentId: () => null,
    setCurrentId: vi.fn(),
  },
}));

vi.mock('@/lib/file-parser', () => ({
  parseFile: vi.fn(),
  parseCSVFile: vi.fn(),
  buildFileContext: vi.fn(() => ({ data: '', totalSize: 0 })),
}));

vi.mock('@/lib/image-store', () => ({
  storeImageDataUrl: vi.fn(async () => ({ id: 'img-1', mime: 'image/png' })),
  deleteImages: vi.fn(async () => {}),
  getImageBlob: vi.fn(async () => null),
}));

vi.mock('@/lib/id-generator', () => {
  let counter = 0;
  return {
    generateScopedId: (prefix: string) => `${prefix}-${++counter}`,
  };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>
    <ChatProvider>{children}</ChatProvider>
  </ToastProvider>
);

describe('ChatContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with empty conversations', () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    expect(result.current.conversations).toEqual({});
    expect(result.current.currentId).toBeNull();
  });

  it('addMessage creates a message in a new conversation', () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    act(() => {
      result.current.addMessage('user', 'Hello world');
    });

    // A conversation should have been created
    const conversations = result.current.conversations;
    const convIds = Object.keys(conversations);
    expect(convIds.length).toBe(1);

    const conv = conversations[convIds[0]];
    expect(conv.messages).toHaveLength(1);
    expect(conv.messages[0].role).toBe('user');
    expect(conv.messages[0].content).toBe('Hello world');
  });

  it('updateMessage modifies message content', () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    let messageId: string;
    act(() => {
      messageId = result.current.addMessage('assistant', 'Thinking...');
    });

    act(() => {
      result.current.updateMessage(messageId!, { content: 'Done thinking!' });
    });

    const conversations = result.current.conversations;
    const conv = Object.values(conversations)[0];
    const msg = conv.messages.find((m) => m.id === messageId);
    expect(msg?.content).toBe('Done thinking!');
  });

  it('getMessagesForApi returns correct format', () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    act(() => {
      result.current.addMessage('user', 'Hello');
    });

    act(() => {
      result.current.addMessage('assistant', 'Hi there');
    });

    const messages = result.current.getMessagesForApi();
    expect(messages.length).toBe(2);
    expect(messages[0]).toEqual({ role: 'user', content: 'Hello' });
    expect(messages[1]).toEqual({ role: 'assistant', content: 'Hi there' });
  });

  it('create creates a new empty conversation', () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    let convId: string;
    act(() => {
      convId = result.current.create();
    });

    expect(result.current.currentId).toBe(convId!);
    const conv = result.current.conversations[convId!];
    expect(conv.title).toBe('New Chat');
    expect(conv.messages).toHaveLength(0);
  });

  it('delete removes a conversation', () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    act(() => {
      result.current.addMessage('user', 'Hello');
    });

    const convId = Object.keys(result.current.conversations)[0];

    act(() => {
      result.current.delete(convId);
    });

    expect(result.current.conversations[convId]).toBeUndefined();
  });

  it('rename updates conversation title', () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    act(() => {
      result.current.create();
    });

    const convId = result.current.currentId!;

    act(() => {
      result.current.rename(convId, 'My Renamed Chat');
    });

    expect(result.current.conversations[convId].title).toBe('My Renamed Chat');
  });

  it('switch changes the current conversation', () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    let id1: string, id2: string;
    act(() => {
      id1 = result.current.create();
    });
    act(() => {
      id2 = result.current.create();
    });

    expect(result.current.currentId).toBe(id2!);

    act(() => {
      result.current.switch(id1!);
    });

    expect(result.current.currentId).toBe(id1!);
  });

  it('clearCurrent empties messages in the current conversation', () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    act(() => {
      result.current.addMessage('user', 'Hello');
    });
    act(() => {
      result.current.addMessage('assistant', 'Hi');
    });

    act(() => {
      result.current.clearCurrent();
    });

    const conv = Object.values(result.current.conversations)[0];
    expect(conv.messages).toHaveLength(0);
    expect(conv.title).toBe('New Chat');
  });

  it('clearFiles resets uploaded files and file context', () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    act(() => {
      result.current.clearFiles();
    });

    expect(result.current.uploadedFiles).toEqual([]);
    expect(result.current.fileContext).toBeNull();
  });

  it('addMessage auto-titles from long content', () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    const longText = 'A'.repeat(60);
    act(() => {
      result.current.addMessage('user', longText);
    });

    const conv = Object.values(result.current.conversations)[0];
    expect(conv.title.length).toBeLessThanOrEqual(50);
    expect(conv.title).toContain('...');
  });

  it('addMessage appends to existing conversation', () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    act(() => {
      result.current.addMessage('user', 'First message');
    });
    act(() => {
      result.current.addMessage('assistant', 'Response');
    });
    act(() => {
      result.current.addMessage('user', 'Follow up');
    });

    const conv = Object.values(result.current.conversations)[0];
    expect(conv.messages).toHaveLength(3);
    expect(conv.messages[2].content).toBe('Follow up');
  });

  it('addMessageToConversation creates conversation if missing', () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    act(() => {
      result.current.addMessageToConversation('new-conv-id', 'user', 'Hello from targeted add');
    });

    const conv = result.current.conversations['new-conv-id'];
    expect(conv).toBeDefined();
    expect(conv.messages).toHaveLength(1);
    expect(conv.messages[0].content).toBe('Hello from targeted add');
  });

  it('addMessageToConversation appends to existing conversation', () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    act(() => {
      result.current.addMessageToConversation('conv-1', 'user', 'First');
    });
    act(() => {
      result.current.addMessageToConversation('conv-1', 'assistant', 'Second');
    });

    const conv = result.current.conversations['conv-1'];
    expect(conv.messages).toHaveLength(2);
    expect(conv.messages[1].content).toBe('Second');
  });

  it('updateMessageInConversation modifies a specific message', () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    let msgId: string | null;
    act(() => {
      msgId = result.current.addMessageToConversation('conv-x', 'assistant', 'Thinking...');
    });

    act(() => {
      result.current.updateMessageInConversation('conv-x', msgId!, { content: 'Done!' });
    });

    const msg = result.current.conversations['conv-x'].messages.find(m => m.id === msgId);
    expect(msg?.content).toBe('Done!');
  });

  it('removeFile removes a single uploaded file', () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    // Manually set uploaded files via the upload flow isn't feasible without File mocks,
    // but we can verify removeFile doesn't throw on an empty list
    act(() => {
      result.current.removeFile('nonexistent-id');
    });

    expect(result.current.uploadedFiles).toEqual([]);
  });

  it('throws when useChat is used outside ChatProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useChat());
    }).toThrow('useChat must be used within a ChatProvider');

    spy.mockRestore();
  });
});
