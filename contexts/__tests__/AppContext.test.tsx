import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppProvider, useApp } from '../AppContext';
import { CONSTANTS } from '@/lib/constants';

// Mock storage so we don't depend on real localStorage side-effects during init
vi.mock('@/lib/storage', () => ({
  appStorage: {
    getTosAccepted: () => false,
    setTosAccepted: vi.fn(),
    getSidebarCollapsed: () => false,
    setSidebarCollapsed: vi.fn(),
    getWebSearchEnabled: () => true,
    setWebSearchEnabled: vi.fn(),
    getSelectedModel: () => CONSTANTS.DEFAULT_MODEL,
    setSelectedModel: vi.fn(),
    getSelectedImageModel: () => CONSTANTS.DEFAULT_IMAGE_MODEL,
    setSelectedImageModel: vi.fn(),
    getSystemPrompt: () => '',
    setSystemPrompt: vi.fn(),
    getDeploymentPassword: () => '',
    setDeploymentPassword: vi.fn(),
    clearDeploymentPassword: vi.fn(),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('AppContext', () => {
  it('provides default state values', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    expect(result.current.selectedModel).toBe(CONSTANTS.DEFAULT_MODEL);
    expect(result.current.selectedImageModel).toBe(CONSTANTS.DEFAULT_IMAGE_MODEL);
    expect(result.current.webSearchEnabled).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.rateLimitRemaining).toBe(20);
    expect(result.current.systemPrompt).toBe('');
  });

  it('setSelectedModel updates state', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.setSelectedModel('test-model');
    });

    expect(result.current.selectedModel).toBe('test-model');
  });

  it('setSystemPrompt updates state', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.setSystemPrompt('Be helpful');
    });

    expect(result.current.systemPrompt).toBe('Be helpful');
  });

  it('setRateLimitRemaining updates state', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.setRateLimitRemaining(15);
    });

    expect(result.current.rateLimitRemaining).toBe(15);
  });

  it('throws when useApp is used outside AppProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useApp());
    }).toThrow('useApp must be used within an AppProvider');

    spy.mockRestore();
  });
});
