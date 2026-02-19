import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, renderHook } from '@testing-library/react';
import { ToastProvider, useToast } from '../ToastContext';

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a toast with the correct message', () => {
    function TestComponent() {
      const { showToast } = useToast();
      return <button onClick={() => showToast('Hello toast')}>Show</button>;
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    act(() => {
      screen.getByText('Show').click();
    });

    expect(screen.getByText('Hello toast')).toBeInTheDocument();
  });

  it('applies error CSS class for error type', () => {
    function TestComponent() {
      const { showToast } = useToast();
      return (
        <button onClick={() => showToast('Oops', 'error')}>Show Error</button>
      );
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    act(() => {
      screen.getByText('Show Error').click();
    });

    const toast = screen.getByText('Oops');
    expect(toast.className).toContain('bg-[var(--toast-error)]');
  });

  it('applies success CSS class for success type', () => {
    function TestComponent() {
      const { showToast } = useToast();
      return (
        <button onClick={() => showToast('Done', 'success')}>
          Show Success
        </button>
      );
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    act(() => {
      screen.getByText('Show Success').click();
    });

    const toast = screen.getByText('Done');
    expect(toast.className).toContain('bg-[var(--toast-success)]');
  });

  it('applies info CSS class for info type', () => {
    function TestComponent() {
      const { showToast } = useToast();
      return (
        <button onClick={() => showToast('FYI', 'info')}>Show Info</button>
      );
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    act(() => {
      screen.getByText('Show Info').click();
    });

    const toast = screen.getByText('FYI');
    expect(toast.className).toContain('bg-[var(--toast-info)]');
  });

  it('auto-dismisses after 4 seconds', () => {
    function TestComponent() {
      const { showToast } = useToast();
      return (
        <button onClick={() => showToast('Bye soon')}>Show Temp</button>
      );
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    act(() => {
      screen.getByText('Show Temp').click();
    });

    expect(screen.getByText('Bye soon')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText('Bye soon')).not.toBeInTheDocument();
  });

  it('dismisses on click', () => {
    function TestComponent() {
      const { showToast } = useToast();
      return (
        <button onClick={() => showToast('Click me away')}>Trigger Dismiss</button>
      );
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    act(() => {
      screen.getByText('Trigger Dismiss').click();
    });

    expect(screen.getByText('Click me away')).toBeInTheDocument();

    act(() => {
      screen.getByText('Click me away').click();
    });

    expect(screen.queryByText('Click me away')).not.toBeInTheDocument();
  });

  it('throws when useToast is used outside ToastProvider', () => {
    // Suppress console.error for this expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useToast());
    }).toThrow('useToast must be used within a ToastProvider');

    spy.mockRestore();
  });
});
