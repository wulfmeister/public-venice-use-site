import { describe, it, expect } from "vitest";
import { friendlyError } from "../error-messages";

describe("friendlyError", () => {
  it("maps 401 errors to session expired message", () => {
    expect(friendlyError(new Error("401 Unauthorized"))).toBe(
      "Session expired. Please re-enter your password.",
    );
  });

  it("maps 429 errors to rate limit message", () => {
    expect(friendlyError(new Error("Request failed: 429"))).toBe(
      "Too many requests. Please wait a minute and try again.",
    );
  });

  it("maps 500/502/503 errors to service unavailable message", () => {
    expect(friendlyError(new Error("500 Internal Server Error"))).toBe(
      "The AI service is temporarily unavailable. Try again shortly.",
    );
    expect(friendlyError(new Error("502 Bad Gateway"))).toBe(
      "The AI service is temporarily unavailable. Try again shortly.",
    );
    expect(friendlyError(new Error("503 Service Unavailable"))).toBe(
      "The AI service is temporarily unavailable. Try again shortly.",
    );
  });

  it("maps 404 errors to model unavailable message", () => {
    expect(friendlyError(new Error("404 Not Found"))).toBe(
      "This model is no longer available. Try selecting a different one.",
    );
  });

  it("maps TypeError to connection lost message", () => {
    expect(friendlyError(new TypeError("Failed to fetch"))).toBe(
      "Connection lost. Check your internet and try again.",
    );
  });

  it("maps fetch errors to connection lost message", () => {
    expect(friendlyError(new Error("fetch failed"))).toBe(
      "Connection lost. Check your internet and try again.",
    );
  });

  it("maps network errors to connection lost message", () => {
    expect(friendlyError(new Error("network error"))).toBe(
      "Connection lost. Check your internet and try again.",
    );
  });

  it("returns default message for unknown errors", () => {
    expect(friendlyError(new Error("Random error"))).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("handles non-Error inputs with default message", () => {
    expect(friendlyError("string error")).toBe(
      "Something went wrong. Please try again.",
    );
    expect(friendlyError(123)).toBe("Something went wrong. Please try again.");
    expect(friendlyError(null)).toBe("Something went wrong. Please try again.");
  });
});
