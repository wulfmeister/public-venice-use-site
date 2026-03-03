import { CONSTANTS } from "../constants";
import { describe, it, expect } from "vitest";

describe("Model Display Names", () => {
  it("returns friendly names for mapped models", () => {
    expect(CONSTANTS.MODEL_DISPLAY_NAMES["zai-org-glm-5"]).toBe("GLM-5");
    expect(CONSTANTS.MODEL_DISPLAY_NAMES["llama-3.3-70b"]).toBe(
      "Llama 3.3 70B",
    );
    expect(CONSTANTS.MODEL_DISPLAY_NAMES["nano-banana-pro"]).toBe(
      "Nano Banana Pro",
    );
  });

  it("falls back to capitalize logic for unmapped models", () => {
    const unmapped = "some-unknown-model-123";
    const expected = "Some Unknown Model 123";
    expect(CONSTANTS.MODEL_DISPLAY_NAMES[unmapped]).toBeUndefined();
  });

  it("has mapping for default model", () => {
    expect(
      CONSTANTS.MODEL_DISPLAY_NAMES[CONSTANTS.DEFAULT_MODEL],
    ).toBeDefined();
    expect(CONSTANTS.MODEL_DISPLAY_NAMES[CONSTANTS.DEFAULT_MODEL]).toBe(
      "GLM-5",
    );
  });
});
