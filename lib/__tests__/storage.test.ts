import { describe, it, expect, beforeEach } from 'vitest';
import { storage, conversationsStorage, appStorage, scheduledPromptStorage } from '../storage';
import { CONSTANTS } from '../constants';

beforeEach(() => {
  localStorage.clear();
});

describe('storage', () => {
  it('stores and retrieves values', () => {
    storage.set('key', { foo: 'bar' });
    expect(storage.get('key')).toEqual({ foo: 'bar' });
  });

  it('returns default for missing keys', () => {
    expect(storage.get('missing', 'fallback')).toBe('fallback');
  });

  it('removes values', () => {
    storage.set('key', 'val');
    storage.remove('key');
    expect(storage.get('key')).toBeUndefined();
  });

  it('clears all values', () => {
    storage.set('a', 1);
    storage.set('b', 2);
    storage.clear();
    expect(storage.get('a')).toBeUndefined();
    expect(storage.get('b')).toBeUndefined();
  });
});

describe('conversationsStorage', () => {
  it('returns empty object by default', () => {
    expect(conversationsStorage.get()).toEqual({});
  });

  it('stores and retrieves conversations', () => {
    const convs = {
      '1': {
        id: '1',
        title: 'Test',
        messages: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        model: 'test'
      }
    };
    conversationsStorage.set(convs);
    expect(conversationsStorage.get()).toEqual(convs);
  });

  it('stores and retrieves current ID', () => {
    conversationsStorage.setCurrentId('abc');
    expect(conversationsStorage.getCurrentId()).toBe('abc');
  });

  it('returns null for missing current ID', () => {
    expect(conversationsStorage.getCurrentId()).toBeNull();
  });

  it('removes current ID when set to null', () => {
    conversationsStorage.setCurrentId('abc');
    conversationsStorage.setCurrentId(null);
    expect(conversationsStorage.getCurrentId()).toBeNull();
  });
});

describe('appStorage', () => {
  it('returns false for TOS by default', () => {
    expect(appStorage.getTosAccepted()).toBe(false);
  });

  it('stores and retrieves TOS', () => {
    appStorage.setTosAccepted(true);
    expect(appStorage.getTosAccepted()).toBe(true);
  });

  it('returns light theme by default', () => {
    expect(appStorage.getTheme()).toBe('light');
  });

  it('stores and retrieves theme', () => {
    appStorage.setTheme('dark');
    expect(appStorage.getTheme()).toBe('dark');
  });

  it('returns false for sidebar collapsed by default', () => {
    expect(appStorage.getSidebarCollapsed()).toBe(false);
  });

  it('returns true for web search enabled by default', () => {
    expect(appStorage.getWebSearchEnabled()).toBe(true);
  });

  it('returns default model when not set', () => {
    expect(appStorage.getSelectedModel()).toBe(CONSTANTS.DEFAULT_MODEL);
  });

  it('stores and retrieves selected model', () => {
    appStorage.setSelectedModel('llama-3.3-70b');
    expect(appStorage.getSelectedModel()).toBe('llama-3.3-70b');
  });

  it('returns default image model when not set', () => {
    expect(appStorage.getSelectedImageModel()).toBe(CONSTANTS.DEFAULT_IMAGE_MODEL);
  });

  it('returns empty system prompt by default', () => {
    expect(appStorage.getSystemPrompt()).toBe('');
  });

  it('stores and retrieves system prompt', () => {
    appStorage.setSystemPrompt('Be concise.');
    expect(appStorage.getSystemPrompt()).toBe('Be concise.');
  });

  it('stores and retrieves web search enabled', () => {
    appStorage.setWebSearchEnabled(false);
    expect(appStorage.getWebSearchEnabled()).toBe(false);
  });

  it('stores and retrieves sidebar collapsed', () => {
    appStorage.setSidebarCollapsed(true);
    expect(appStorage.getSidebarCollapsed()).toBe(true);
  });

  it('stores and retrieves selected image model', () => {
    appStorage.setSelectedImageModel('venice-sd35');
    expect(appStorage.getSelectedImageModel()).toBe('venice-sd35');
  });
});

describe('scheduledPromptStorage', () => {
  it('returns null by default', () => {
    expect(scheduledPromptStorage.get()).toBeNull();
  });

  it('stores and retrieves settings', () => {
    const settings = {
      enabled: true,
      prompt: 'Daily summary',
      hour: 9,
      minute: 0,
      model: '',
      webSearch: 'current' as const,
      lastRunDate: '',
      lastRunTime: '',
      conversationId: ''
    };
    scheduledPromptStorage.set(settings);
    expect(scheduledPromptStorage.get()).toEqual(settings);
  });

  it('returns true for collapsed by default', () => {
    expect(scheduledPromptStorage.isCollapsed()).toBe(true);
  });

  it('stores collapsed state', () => {
    scheduledPromptStorage.setCollapsed(false);
    expect(scheduledPromptStorage.isCollapsed()).toBe(false);
  });
});
