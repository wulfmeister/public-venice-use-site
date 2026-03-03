export function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("401")) {
    return "Session expired. Please re-enter your password.";
  }
  if (message.includes("429")) {
    return "Too many requests. Please wait a minute and try again.";
  }
  if (
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503")
  ) {
    return "The AI service is temporarily unavailable. Try again shortly.";
  }
  if (message.includes("404")) {
    return "This model is no longer available. Try selecting a different one.";
  }
  if (
    error instanceof TypeError ||
    message.includes("fetch") ||
    message.includes("network")
  ) {
    return "Connection lost. Check your internet and try again.";
  }
  return "Something went wrong. Please try again.";
}
