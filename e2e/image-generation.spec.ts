import { test, expect } from "@playwright/test";

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

test.describe("Image generation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("tosAccepted", "true");
      localStorage.setItem("passwordRequired", "true");
      localStorage.setItem("deploymentPassword", JSON.stringify("test"));
    });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Welcome to OpenChat" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("renders generated image in chat", async ({ page }) => {
    await page.route("**/api/image", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "X-RateLimit-Remaining": "4",
          "X-RateLimit-Limit": "5",
        },
        body: JSON.stringify({
          image_data_url: `data:image/png;base64,${TINY_PNG_BASE64}`,
          mime: "image/png",
        }),
      });
    });

    const generateImageBtn = page
      .getByRole("button", { name: /Generate image/i })
      .first();
    await generateImageBtn.click();

    const textarea = page.locator("textarea").first();
    await expect(textarea).toHaveAttribute(
      "placeholder",
      /Describe the image/i,
    );
    await textarea.fill("A red pixel");
    await page.keyboard.press("Enter");

    await expect(page.getByText("A red pixel")).toBeVisible({ timeout: 10000 });

    const assistantImage = page.locator("div.group\\/msg img").first();
    await expect(assistantImage).toBeVisible({ timeout: 15000 });

    const src = await assistantImage.getAttribute("src");
    expect(src).toBeTruthy();
    expect(src!.startsWith("blob:") || src!.startsWith("data:image")).toBe(
      true,
    );
  });

  test("shows error message on API failure", async ({ page }) => {
    await page.route("**/api/image", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Venice image API error", status: 500 }),
      });
    });

    const generateImageBtn = page
      .getByRole("button", { name: /Generate image/i })
      .first();
    await generateImageBtn.click();

    const textarea = page.locator("textarea").first();
    await textarea.fill("A broken image");
    await page.keyboard.press("Enter");

    await expect(page.getByText("A broken image")).toBeVisible({
      timeout: 10000,
    });

    const assistantMsg = page.locator("div.group\\/msg").last();
    await expect(assistantMsg).toBeVisible({ timeout: 15000 });
    await expect(page.locator("div.group\\/msg img")).toHaveCount(0);
  });

  test("placeholder resets after image generation completes", async ({
    page,
  }) => {
    await page.route("**/api/image", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "X-RateLimit-Remaining": "4",
          "X-RateLimit-Limit": "5",
        },
        body: JSON.stringify({
          image_data_url: `data:image/png;base64,${TINY_PNG_BASE64}`,
          mime: "image/png",
        }),
      });
    });

    const generateImageBtn = page
      .getByRole("button", { name: /Generate image/i })
      .first();
    await generateImageBtn.click();

    const textarea = page.locator("textarea").first();
    await textarea.fill("A test image");
    await page.keyboard.press("Enter");

    const assistantImage = page.locator("div.group\\/msg img").first();
    await expect(assistantImage).toBeVisible({ timeout: 15000 });

    await expect(textarea).not.toHaveAttribute(
      "placeholder",
      /Describe the image/i,
    );
  });
});
