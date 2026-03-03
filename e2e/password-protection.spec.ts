import { test, expect } from "@playwright/test";

/**
 * These tests require the server to be running with DEPLOYMENT_PASSWORD=test
 * Start the server with: DEPLOYMENT_PASSWORD=test npm run dev -- --port 3005
 * Then run: npx playwright test e2e/password-protection.spec.ts --config playwright.config.password.ts
 *
 * Or use: npm run test:password (see package.json)
 */

test.describe("Password protection with env var", () => {
  test("API info endpoint reports password_required when env var is set", async ({
    request,
  }) => {
    const response = await request.get("/api/info");
    const body = await response.json();

    expect(body.password_required).toBe(true);
  });

  test("API endpoints return 401 without deployment password header", async ({
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

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("password");
  });

  test("API endpoints work with correct deployment password", async ({
    request,
  }) => {
    const response = await request.post("/api/chat", {
      headers: {
        "Content-Type": "application/json",
        "X-TOS-Accepted": "true",
        "X-Deployment-Password": "test",
      },
      data: {
        model: "zai-org-glm-5",
        messages: [{ role: "user", content: "test" }],
      },
    });

    expect(response.status()).not.toBe(401);
  });

  test("UI shows password gate when server requires password", async ({
    page,
  }) => {
    await page.goto("/");

    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.waitForTimeout(500);

    await expect(
      page.getByRole("dialog", { name: "Password Required" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder("Enter password")).toBeVisible();
    await expect(page.getByText("password-protected")).toBeVisible();

    await page.getByPlaceholder("Enter password").fill("test");
    await page.getByRole("button", { name: "Submit" }).click();

    await expect(
      page.getByRole("dialog", { name: "Password Required" }),
    ).not.toBeVisible();

    const acceptBtn = page.getByRole("button", { name: "I Accept" });
    await expect(acceptBtn).toBeVisible();
  });

  test("UI rejects wrong password and accepts correct password", async ({
    page,
  }) => {
    await page.goto("/");

    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.waitForTimeout(500);

    await expect(
      page.getByRole("dialog", { name: "Password Required" }),
    ).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder("Enter password").fill("wrong-password");
    await page.getByRole("button", { name: "Submit" }).click();

    await expect(page.getByText("Incorrect password")).toBeVisible();

    await page.getByPlaceholder("Enter password").clear();
    await page.getByPlaceholder("Enter password").fill("test");
    await page.getByRole("button", { name: "Submit" }).click();

    await expect(
      page.getByRole("dialog", { name: "Password Required" }),
    ).not.toBeVisible();

    await page.getByRole("button", { name: "I Accept" }).click();

    await expect(
      page.getByRole("heading", { name: "Welcome to OpenChat" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("password is cached in localStorage after successful entry", async ({
    page,
  }) => {
    await page.goto("/");

    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.waitForTimeout(500);

    await expect(
      page.getByRole("dialog", { name: "Password Required" }),
    ).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder("Enter password").fill("test");
    await page.getByRole("button", { name: "Submit" }).click();

    await expect(
      page.getByRole("dialog", { name: "Password Required" }),
    ).not.toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: "I Accept" }).click();

    await expect(
      page.getByRole("heading", { name: "Welcome to OpenChat" }),
    ).toBeVisible({ timeout: 10000 });

    const cachedPassword = await page.evaluate(() =>
      localStorage.getItem("deploymentPassword"),
    );
    expect(cachedPassword).toBe('"test"');

    await page.reload();

    await expect(
      page.getByRole("heading", { name: "Welcome to OpenChat" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("dialog", { name: "Password Required" }),
    ).not.toBeVisible();
  });
});
