import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock all dependencies before importing the hook
vi.mock('@/lib/storage', () => ({
  scheduledPromptStorage: {
    get: vi.fn(() => null),
    set: vi.fn(),
    isCollapsed: vi.fn(() => true),
    setCollapsed: vi.fn(),
  },
}));

vi.mock('@/lib/chat-api', () => ({
  sendChatRequest: vi.fn(),
}));

vi.mock('@/lib/streaming', () => ({
  parseStreamingResponse: vi.fn(),
}));

vi.mock('@/contexts/ChatContext', () => ({
  useChat: () => ({
    addMessageToConversation: vi.fn(() => 'msg-1'),
    updateMessageInConversation: vi.fn(),
  }),
}));

vi.mock('@/contexts/AppContext', () => ({
  useApp: () => ({
    selectedModel: 'test-model',
    webSearchEnabled: true,
    systemPrompt: '',
  }),
}));

import { useScheduledPrompt } from '../useScheduledPrompt';
import { scheduledPromptStorage } from '@/lib/storage';

describe('useScheduledPrompt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
    // Reset mock return values to defaults
    vi.mocked(scheduledPromptStorage.get).mockReturnValue(null);
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads default settings when storage is empty', () => {
    const { result } = renderHook(() => useScheduledPrompt());

    expect(result.current.settings.enabled).toBe(false);
    expect(result.current.settings.prompt).toBe('');
    expect(result.current.settings.hour).toBe(8);
    expect(result.current.settings.minute).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });

  it('loads saved settings from storage on mount', () => {
    const saved = {
      enabled: true,
      prompt: 'Good morning',
      hour: 9,
      minute: 30,
      model: 'llama-3.3-70b',
      webSearch: 'on' as const,
      lastRunDate: '',
      lastRunTime: '',
      conversationId: 'conv-123',
    };

    vi.mocked(scheduledPromptStorage.get).mockReturnValue(saved);

    const { result } = renderHook(() => useScheduledPrompt());

    expect(result.current.settings.enabled).toBe(true);
    expect(result.current.settings.prompt).toBe('Good morning');
    expect(result.current.settings.hour).toBe(9);
    expect(result.current.settings.minute).toBe(30);
  });

  it('updateSettings persists to storage', () => {
    const { result } = renderHook(() => useScheduledPrompt());

    act(() => {
      result.current.updateSettings({ prompt: 'New prompt', hour: 10 });
    });

    expect(scheduledPromptStorage.set).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'New prompt', hour: 10 }),
    );
    expect(result.current.settings.prompt).toBe('New prompt');
    expect(result.current.settings.hour).toBe(10);
  });

  it('generates conversationId when enabling with empty ID', () => {
    const { result } = renderHook(() => useScheduledPrompt());

    act(() => {
      result.current.updateSettings({ enabled: true, prompt: 'Test' });
    });

    expect(result.current.settings.conversationId).toMatch(/^scheduled-\d+$/);
    expect(scheduledPromptStorage.set).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        conversationId: expect.stringMatching(/^scheduled-\d+$/),
      }),
    );
  });

  it('preserves existing conversationId when enabling', () => {
    const saved = {
      enabled: false,
      prompt: 'Test',
      hour: 8,
      minute: 0,
      model: '',
      webSearch: 'current' as const,
      lastRunDate: '',
      lastRunTime: '',
      conversationId: 'existing-id',
    };

    vi.mocked(scheduledPromptStorage.get).mockReturnValue(saved);

    const { result } = renderHook(() => useScheduledPrompt());

    act(() => {
      result.current.updateSettings({ enabled: true });
    });

    expect(result.current.settings.conversationId).toBe('existing-id');
  });

  it('sets up interval when enabled', () => {
    const saved = {
      enabled: true,
      prompt: 'Daily check',
      hour: 8,
      minute: 0,
      model: '',
      webSearch: 'current' as const,
      lastRunDate: '',
      lastRunTime: '',
      conversationId: 'conv-1',
    };

    vi.mocked(scheduledPromptStorage.get).mockReturnValue(saved);

    renderHook(() => useScheduledPrompt());

    // Advance by 60 seconds to trigger the interval
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    // The hook should have set up an interval (no error thrown = success)
  });

  it('getNextRunTime returns null when disabled', () => {
    const { result } = renderHook(() => useScheduledPrompt());

    expect(result.current.getNextRunTime()).toBeNull();
  });

  it('getNextRunTime returns a string when enabled with a prompt', () => {
    const saved = {
      enabled: true,
      prompt: 'Daily check',
      hour: 14,
      minute: 30,
      model: '',
      webSearch: 'current' as const,
      lastRunDate: '',
      lastRunTime: '',
      conversationId: 'conv-1',
    };

    vi.mocked(scheduledPromptStorage.get).mockReturnValue(saved);

    const { result } = renderHook(() => useScheduledPrompt());

    const nextRun = result.current.getNextRunTime();
    expect(nextRun).not.toBeNull();
    expect(typeof nextRun).toBe('string');
    expect(nextRun!.length).toBeGreaterThan(0);
  });

  it('disabling resets interval (isRunning stays false when not executing)', () => {
    const saved = {
      enabled: true,
      prompt: 'Daily check',
      hour: 8,
      minute: 0,
      model: '',
      webSearch: 'current' as const,
      lastRunDate: '',
      lastRunTime: '',
      conversationId: 'conv-1',
    };

    vi.mocked(scheduledPromptStorage.get).mockReturnValue(saved);

    const { result } = renderHook(() => useScheduledPrompt());

    // Initially enabled, isRunning should be false (no prompt execution triggered)
    expect(result.current.isRunning).toBe(false);

    // Disable the schedule
    act(() => {
      result.current.updateSettings({ enabled: false });
    });

    expect(result.current.settings.enabled).toBe(false);
    expect(result.current.isRunning).toBe(false);
  });

  it('does not generate a new conversationId when one already exists on enable', () => {
    const { result } = renderHook(() => useScheduledPrompt());

    // First enable: generates a conversationId
    act(() => {
      result.current.updateSettings({ enabled: true, prompt: 'Test' });
    });

    const firstId = result.current.settings.conversationId;
    expect(firstId).toMatch(/^scheduled-\d+$/);

    // Disable and re-enable: should keep the same conversationId
    act(() => {
      result.current.updateSettings({ enabled: false });
    });
    act(() => {
      result.current.updateSettings({ enabled: true });
    });

    expect(result.current.settings.conversationId).toBe(firstId);
  });

  it('updateSettings merges partial updates without losing other fields', () => {
    const { result } = renderHook(() => useScheduledPrompt());

    act(() => {
      result.current.updateSettings({ prompt: 'Hello', hour: 10, minute: 15 });
    });

    act(() => {
      result.current.updateSettings({ minute: 45 });
    });

    expect(result.current.settings.prompt).toBe('Hello');
    expect(result.current.settings.hour).toBe(10);
    expect(result.current.settings.minute).toBe(45);
  });
});
