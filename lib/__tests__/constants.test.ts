import { describe, it, expect } from "vitest";
import { CONSTANTS } from "../constants";

describe("CONSTANTS", () => {
  it("has reasonable rate limit", () => {
    expect(CONSTANTS.RATE_LIMIT).toBe(20);
    expect(CONSTANTS.RATE_WINDOW).toBe(3600000);
  });

  it("has Venice base URL", () => {
    expect(CONSTANTS.VENICE_BASE_URL).toBe("https://api.venice.ai/api/v1");
  });

  it("has default models", () => {
    expect(CONSTANTS.DEFAULT_MODEL).toBe("zai-org-glm-5");
    expect(CONSTANTS.DEFAULT_IMAGE_MODEL).toBe("nano-banana-pro");
  });

  it("has image models list", () => {
    expect(CONSTANTS.IMAGE_MODELS).toContain("nano-banana-pro");
    expect(CONSTANTS.IMAGE_MODELS).toContain("upscaler");
  });

  it("has file upload limits", () => {
    expect(CONSTANTS.MAX_FILES).toBe(5);
    expect(CONSTANTS.MAX_SINGLE_FILE_SIZE).toBeLessThan(
      CONSTANTS.MAX_TOTAL_SIZE,
    );
  });

  it("has chat limits", () => {
    expect(CONSTANTS.CHAT_CONTEXT_LIMIT).toBeGreaterThan(0);
    expect(CONSTANTS.MAX_CHAT_MESSAGES).toBeGreaterThan(0);
    expect(CONSTANTS.MAX_CHAT_MESSAGE_LENGTH).toBeGreaterThan(0);
  });

  it("has pricing thresholds", () => {
    expect(CONSTANTS.MAX_INPUT_PRICE).toBeGreaterThan(0);
    expect(CONSTANTS.MAX_OUTPUT_PRICE).toBeGreaterThan(0);
  });

  it("has quick actions", () => {
    expect(CONSTANTS.QUICK_ACTIONS.length).toBeGreaterThan(0);
    for (const action of CONSTANTS.QUICK_ACTIONS) {
      expect(action.icon).toBeDefined();
      expect(action.label).toBeDefined();
      // Actions can have either a prompt or an action type (e.g., generateImage)
      const hasPrompt = "prompt" in action;
      const hasActionType = "action" in action;
      expect(hasPrompt || hasActionType).toBe(true);
    }
  });

  it("has exactly 6 quick actions", () => {
    expect(CONSTANTS.QUICK_ACTIONS.length).toBe(6);
  });

  it("includes generate image action", () => {
    const generateImageAction = CONSTANTS.QUICK_ACTIONS.find(
      (action) => "action" in action && action.action === "generateImage",
    );
    expect(generateImageAction).toBeDefined();
    expect(generateImageAction?.label).toBe("Generate image");
  });

  it("has text prompt actions for auto-send", () => {
    const promptActions = CONSTANTS.QUICK_ACTIONS.filter(
      (action) => "prompt" in action,
    );
    expect(promptActions.length).toBe(5);
    for (const action of promptActions) {
      expect(action.prompt).toBeDefined();
      expect(action.prompt.length).toBeGreaterThan(0);
    }
  });

  it("does not include write or edit text action", () => {
    const writeTextAction = CONSTANTS.QUICK_ACTIONS.find(
      (action) =>
        "label" in action &&
        (action as { label: string }).label === "Write or edit text",
    );
    expect(writeTextAction).toBeUndefined();
  });
});
