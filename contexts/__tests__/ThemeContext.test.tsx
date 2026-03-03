import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../ThemeContext";

vi.mock("@/lib/storage", () => ({
  appStorage: {
    getTheme: vi.fn(() => "light"),
    setTheme: vi.fn(),
  },
}));

import { appStorage } from "@/lib/storage";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe("ThemeContext", () => {
  beforeEach(() => {
    vi.mocked(appStorage.getTheme).mockReturnValue("light");
    document.documentElement.removeAttribute("data-theme");
  });

  it("defaults to light theme", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("light");
  });

  it("sets data-theme attribute on documentElement", () => {
    renderHook(() => useTheme(), { wrapper });
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("toggle switches light → dark", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => {
      result.current.toggle();
    });
    expect(result.current.theme).toBe("dark");
  });

  it("toggle switches dark → light", () => {
    vi.mocked(appStorage.getTheme).mockReturnValue("dark");
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => {
      result.current.toggle();
    });
    expect(result.current.theme).toBe("light");
  });

  it("set() assigns specific theme", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => {
      result.current.set("dark");
    });
    expect(result.current.theme).toBe("dark");
  });

  it("persists theme to storage on change", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => {
      result.current.toggle();
    });
    expect(appStorage.setTheme).toHaveBeenCalledWith("dark");
  });

  it("updates data-theme on toggle", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => {
      result.current.toggle();
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("throws when useTheme is used outside ThemeProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow("useTheme must be used within a ThemeProvider");
    spy.mockRestore();
  });

  it("reads initial theme from storage", () => {
    vi.mocked(appStorage.getTheme).mockReturnValue("dark");
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("dark");
  });
});
