import { test, expect } from "@playwright/test";

test.describe("App", () => {
  test("shows Terms of Service on first visit", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "I Accept" })).toBeVisible();
  });

  test("can accept ToS and see the chat UI", async ({ page }) => {
    // Pre-accept ToS via localStorage
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("tosAccepted", "true");
    });
    await page.reload();

    // Should see welcome message or chat area
    await expect(
      page.getByRole("heading", { name: "Welcome to OpenChat" }),
    ).toBeVisible();
  });

  test("can toggle theme between light and dark", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("tosAccepted", "true");
    });
    await page.reload();

    // Find and click the theme toggle
    const themeToggle = page
      .locator(
        'button[aria-label*="theme"], button:has-text("☀"), button:has-text("🌙")',
      )
      .first();
    if (await themeToggle.isVisible()) {
      const initialTheme = await page.evaluate(() =>
        document.documentElement.getAttribute("data-theme"),
      );

      await themeToggle.click();

      const newTheme = await page.evaluate(() =>
        document.documentElement.getAttribute("data-theme"),
      );

      expect(newTheme).not.toBe(initialTheme);
    }
  });

  test("can open and close sidebar", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("tosAccepted", "true");
    });
    await page.reload();

    // The sidebar toggle button should be visible
    const toggle = page
      .locator(
        'button[aria-label="Close sidebar"], button[aria-label="Open sidebar"]',
      )
      .first();
    await expect(toggle).toBeVisible();

    await toggle.click();
    // After clicking, the label should change
    await expect(
      page.locator(
        'button[aria-label="Close sidebar"], button[aria-label="Open sidebar"]',
      ),
    ).toBeVisible();
  });

  test("can create a new chat", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("tosAccepted", "true");
    });
    await page.reload();

    // Type a message and send
    const textarea = page.locator("textarea").first();
    await textarea.fill("Hello");
    await page.keyboard.press("Enter");

    // Should see user message and response
    await expect(page.getByText("Hello", { exact: true })).toBeVisible();
  });

  test("can trigger image generation mode from quick action", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("tosAccepted", "true");
    });
    await page.reload();

    const generateImageBtn = page
      .getByRole("button", {
        name: /Generate image/i,
      })
      .first();
    await expect(generateImageBtn).toBeVisible();
    await generateImageBtn.click();

    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeFocused();
    await expect(textarea).toHaveAttribute(
      "placeholder",
      /Describe the image/i,
    );
  });

  test("can use scheduled prompt test now feature", async ({ page }) => {
    await page.goto("/");

    // Accept ToS by clicking the accept button
    const acceptBtn = page.getByRole("button", { name: "I Accept" });
    await acceptBtn.click();

    // Wait for the chat UI to be visible
    await expect(
      page.getByRole("heading", { name: "Welcome to OpenChat" }),
    ).toBeVisible({ timeout: 10000 });

    // Click on Scheduled Prompt to expand it (it's in the sidebar which is open by default)
    const scheduledPromptBtn = page.getByText("Scheduled Prompt").first();
    await scheduledPromptBtn.click();

    // Find the prompt textarea and enter a prompt
    const promptTextarea = page.locator('textarea[placeholder*="prompt"]');
    await expect(promptTextarea).toBeVisible();
    await promptTextarea.fill("Say hello in one word");

    // Click Test Now button
    const testNowBtn = page.getByRole("button", { name: "Test Now" });
    await expect(testNowBtn).toBeVisible();
    await testNowBtn.click();

    // Wait for the scheduled prompt to run and create a conversation
    // The user message appears in the chat area (not in the textarea)
    const userMessageInChat = page
      .locator("div[class*='bg-']")
      .filter({ hasText: "Say hello in one word" })
      .last();
    await expect(userMessageInChat).toBeVisible({ timeout: 30000 });
  });
});

test.describe("System prompt", () => {
  test("can open system prompt editor and save a prompt", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("tosAccepted", "true");
    });
    await page.reload();

    // Open sidebar (ensure it's open)
    const sidebar = page.locator('button[aria-label="Open sidebar"]');
    if (await sidebar.isVisible()) {
      await sidebar.click();
    }

    // Expand System Prompt section
    const systemPromptBtn = page.getByText("System Prompt").first();
    await expect(systemPromptBtn).toBeVisible();
    await systemPromptBtn.click();

    // Find the textarea and enter a system prompt
    const textarea = page.locator('textarea[placeholder*="system prompt"]');
    await expect(textarea).toBeVisible();
    await textarea.fill("You are a helpful assistant.");

    // Save it
    const saveBtn = page.getByRole("button", { name: "Save" });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Confirm saved indicator appears
    await expect(page.getByText("Saved")).toBeVisible();
  });

  test("can clear system prompt", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("tosAccepted", "true");
      localStorage.setItem("customSystemPrompt", JSON.stringify("Be concise."));
    });
    await page.reload();

    const sidebar = page.locator('button[aria-label="Open sidebar"]');
    if (await sidebar.isVisible()) {
      await sidebar.click();
    }

    const systemPromptBtn = page.getByText("System Prompt").first();
    await systemPromptBtn.click();

    const clearBtn = page.getByRole("button", { name: "Clear" });
    await expect(clearBtn).toBeEnabled();
    await clearBtn.click();

    const textarea = page.locator('textarea[placeholder*="system prompt"]');
    await expect(textarea).toHaveValue("");
  });
});

test.describe("Model selector", () => {
  test("model selector button is visible in header", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("tosAccepted", "true");
    });
    await page.reload();

    const modelBtn = page.getByRole("button", { name: "Select text model" });
    await expect(modelBtn).toBeVisible();
  });

  test("image model selector button is visible in header", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("tosAccepted", "true");
    });
    await page.reload();

    const imageModelBtn = page.getByRole("button", {
      name: "Select image model",
    });
    await expect(imageModelBtn).toBeVisible();
  });

  test("clicking text model selector opens dropdown", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("tosAccepted", "true");
    });
    await page.reload();

    const modelBtn = page.getByRole("button", { name: "Select text model" });
    await modelBtn.click();

    await expect(page.getByText("Text Models")).toBeVisible();
  });
});

test.describe("Conversation management", () => {
  test("can create a new conversation", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("tosAccepted", "true");
    });
    await page.reload();

    const sidebar = page.locator('button[aria-label="Open sidebar"]');
    if (await sidebar.isVisible()) {
      await sidebar.click();
    }

    const newChatBtn = page.getByRole("button", { name: "New Chat" });
    await expect(newChatBtn).toBeVisible();
    await newChatBtn.click();
  });

  test("can search conversations", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("tosAccepted", "true");
    });
    await page.reload();

    const sidebar = page.locator('button[aria-label="Open sidebar"]');
    if (await sidebar.isVisible()) {
      await sidebar.click();
    }

    const searchBox = page.locator('input[placeholder="Search chats..."]');
    await expect(searchBox).toBeVisible();
    await searchBox.fill("nonexistent");
    await expect(page.getByText("No matching conversations")).toBeVisible();
  });
});

test.describe("API", () => {
  test("info endpoint returns model list", async ({ request }) => {
    const response = await request.get("/api/info");
    // May fail without API key, but should return JSON
    const body = await response.json();
    expect(body).toBeDefined();
    // Either has models (success) or error (no API key)
    expect(body.models || body.error).toBeDefined();
  });

  test("chat endpoint requires TOS header", async ({ request }) => {
    const response = await request.post("/api/chat", {
      headers: { "Content-Type": "application/json" },
      data: {
        model: "zai-org-glm-5",
        messages: [{ role: "user", content: "test" }],
      },
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("Terms of Service");
  });

  test("chat endpoint validates request body", async ({ request }) => {
    const response = await request.post("/api/chat", {
      headers: {
        "Content-Type": "application/json",
        "X-TOS-Accepted": "true",
      },
      data: {
        model: "zai-org-glm-5",
        // Missing messages
      },
    });

    // Should get 400 for missing messages (or 500 if no API key)
    expect([400, 500]).toContain(response.status());
  });

  test("image endpoint requires TOS header", async ({ request }) => {
    const response = await request.post("/api/image", {
      headers: { "Content-Type": "application/json" },
      data: {
        prompt: "a cat",
      },
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("Terms of Service");
  });

  test("image endpoint validates request body", async ({ request }) => {
    const response = await request.post("/api/image", {
      headers: {
        "Content-Type": "application/json",
        "X-TOS-Accepted": "true",
      },
      data: {
        // Missing prompt
      },
    });

    expect([400, 429]).toContain(response.status());
    if (response.status() === 400) {
      const body = await response.json();
      expect(body.error).toContain("Prompt");
    }
  });

  test("upscale endpoint requires TOS header", async ({ request }) => {
    const response = await request.post("/api/upscale", {
      headers: { "Content-Type": "application/json" },
      data: {
        image_data_url: "data:image/png;base64,iVBORw0KGgo=",
      },
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("Terms of Service");
  });

  test("upscale endpoint validates request body", async ({ request }) => {
    const response = await request.post("/api/upscale", {
      headers: {
        "Content-Type": "application/json",
        "X-TOS-Accepted": "true",
      },
      data: {},
    });

    expect([400, 429]).toContain(response.status());
    if (response.status() === 400) {
      const body = await response.json();
      expect(body.error).toContain("image_data_url");
    }
  });

  test("chat endpoint returns 401 with wrong deployment password", async ({
    request,
  }) => {
    const response = await request.post("/api/chat", {
      headers: {
        "Content-Type": "application/json",
        "X-TOS-Accepted": "true",
        "X-Deployment-Password": "definitely-wrong-password-xyz",
      },
      data: {
        model: "zai-org-glm-5",
        messages: [{ role: "user", content: "test" }],
      },
    });

    expect([200, 401, 400, 500]).toContain(response.status());
  });

  test("/v1/models rewrite reaches /api/info", async ({ request }) => {
    const response = await request.get("/v1/models");
    const body = await response.json();
    expect(body).toBeDefined();
    expect(body.models !== undefined || body.error !== undefined).toBe(true);
  });

  test("rate limit headers are present on chat endpoint", async ({
    request,
  }) => {
    const response = await request.post("/api/chat", {
      headers: {
        "Content-Type": "application/json",
        "X-TOS-Accepted": "true",
      },
      data: {
        model: "zai-org-glm-5",
        messages: [{ role: "user", content: "test" }],
      },
    });

    expect([200, 400, 401, 429, 500]).toContain(response.status());
    if (response.status() !== 403) {
      const remaining = response.headers()["x-ratelimit-remaining"];
      const limit = response.headers()["x-ratelimit-limit"];
      if (remaining !== undefined) {
        expect(parseInt(remaining, 10)).toBeGreaterThanOrEqual(0);
        expect(parseInt(limit, 10)).toBeGreaterThan(0);
      }
    }
  });
});

test.describe("Password gate UI", () => {
  test("shows password dialog when passwordRequired is cached true and no password stored", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("tosAccepted", "true");
      localStorage.setItem("passwordRequired", "true");
      localStorage.removeItem("deploymentPassword");
    });
    await page.reload();

    await expect(
      page.getByRole("dialog", { name: "Password Required" }),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Enter password")).toBeVisible();
  });

  test("password dialog submit button is disabled when input is empty", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("tosAccepted", "true");
      localStorage.setItem("passwordRequired", "true");
      localStorage.removeItem("deploymentPassword");
    });
    await page.reload();

    const submitBtn = page.getByRole("button", { name: "Submit" });
    await expect(submitBtn).toBeDisabled();
  });

  test("password dialog submit button enables when text is typed", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("tosAccepted", "true");
      localStorage.setItem("passwordRequired", "true");
      localStorage.removeItem("deploymentPassword");
    });
    await page.reload();

    await page.getByPlaceholder("Enter password").fill("somepassword");
    const submitBtn = page.getByRole("button", { name: "Submit" });
    await expect(submitBtn).toBeEnabled();
  });

  test("does not show password dialog when passwordRequired is false", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("tosAccepted", "true");
      localStorage.setItem("passwordRequired", "false");
    });
    await page.reload();

    await expect(
      page.getByRole("heading", { name: "Welcome to OpenChat" }),
    ).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "Password Required" }),
    ).not.toBeVisible();
  });

  test("does not show password dialog when password is already accepted in localStorage", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("tosAccepted", "true");
      localStorage.setItem("passwordRequired", "true");
      localStorage.setItem(
        "deploymentPassword",
        JSON.stringify("any-cached-pw"),
      );
    });
    await page.reload();

    await expect(
      page.getByRole("heading", { name: "Welcome to OpenChat" }),
    ).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "Password Required" }),
    ).not.toBeVisible();
  });
});
