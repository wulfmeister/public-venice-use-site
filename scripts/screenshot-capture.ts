import { chromium, devices } from "playwright";
import path from "path";

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = "/tmp/screenshots";

async function acceptTosIfPresent(page: any) {
  // Try to find and click the "I Accept" button
  const acceptButton = page
    .locator(
      'button:has-text("I Accept"), button:has-text("Accept"), button[aria-label*="accept" i]',
    )
    .first();
  try {
    if (await acceptButton.isVisible({ timeout: 3000 })) {
      await acceptButton.click();
      await page.waitForTimeout(500);
      return true;
    }
  } catch {
    // No ToS dialog or button not found
  }
  return false;
}

async function captureScreenshots() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });

  try {
    // Screenshot 1: Welcome/Empty State (Desktop)
    console.log("\n1. Capturing welcome state...");
    const context1 = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const page1 = await context1.newPage();

    await page1.goto(BASE_URL);
    await page1.waitForLoadState("networkidle");

    // Accept ToS if present
    await acceptTosIfPresent(page1);

    // Wait for the chat input to be ready
    await page1.waitForSelector("textarea", { timeout: 15000 });

    await page1.screenshot({
      path: path.join(SCREENSHOT_DIR, "01-welcome-empty-state.png"),
      fullPage: true,
    });
    console.log("   ✓ Captured welcome/empty state");
    await context1.close();

    // Screenshot 2: Chat with Messages
    console.log("\n2. Capturing chat with messages...");
    const context2 = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const page2 = await context2.newPage();

    await page2.goto(BASE_URL);
    await page2.waitForLoadState("networkidle");
    await acceptTosIfPresent(page2);

    // Find textarea and send a message
    const textarea = page2.locator("textarea").first();
    await textarea.waitFor({ state: "visible", timeout: 15000 });
    await textarea.fill("Hello, this is a test message for screenshot!");

    // Submit the form by clicking the submit button or pressing Enter
    const submitButton = page2
      .locator('button[type="submit"], form button')
      .first();
    await submitButton.click();

    // Wait for the message to appear in the chat
    await page2.waitForTimeout(1500); // Wait for message to render

    await page2.screenshot({
      path: path.join(SCREENSHOT_DIR, "02-chat-with-messages.png"),
      fullPage: true,
    });
    console.log("   ✓ Captured chat with messages");
    await context2.close();

    // Screenshot 3: Settings Sidebar Open
    console.log("\n3. Capturing settings sidebar open...");
    const context3 = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const page3 = await context3.newPage();

    await page3.goto(BASE_URL);
    await page3.waitForLoadState("networkidle");
    await acceptTosIfPresent(page3);

    // Wait for the app to be ready
    await page3.waitForSelector("textarea", { timeout: 15000 });

    // Try to find and click the sidebar toggle button
    const sidebarToggle = page3
      .locator(
        'button[aria-label*="sidebar" i], button[title*="sidebar" i], button[class*="sidebar" i]',
      )
      .first();
    try {
      await sidebarToggle.click({ timeout: 3000 });
      await page3.waitForTimeout(500);
    } catch {
      // Sidebar might already be open or toggle not found
    }

    // Look for settings-related elements and click them to expand
    const settingsElements = [
      'button:has-text("Settings")',
      'button:has-text("settings")',
      '[aria-label*="settings" i]',
      "summary",
      "details",
      ".settings",
      '[class*="setting" i]',
    ];

    for (const selector of settingsElements) {
      const element = page3.locator(selector).first();
      try {
        if (await element.isVisible({ timeout: 1000 })) {
          await element.click();
          await page3.waitForTimeout(500);
          break;
        }
      } catch {
        // Continue to next selector
      }
    }

    await page3.screenshot({
      path: path.join(SCREENSHOT_DIR, "03-settings-sidebar-open.png"),
      fullPage: true,
    });
    console.log("   ✓ Captured settings sidebar open");
    await context3.close();

    // Screenshot 4: Mobile Viewport (375x667)
    console.log("\n4. Capturing mobile viewport...");
    const mobileContext = await browser.newContext({
      ...devices["iPhone SE"],
      viewport: { width: 375, height: 667 },
    });
    const mobilePage = await mobileContext.newPage();

    await mobilePage.goto(BASE_URL);
    await mobilePage.waitForLoadState("networkidle");
    await acceptTosIfPresent(mobilePage);

    await mobilePage.waitForSelector('textarea, [class*="welcome"], h1, h2', {
      timeout: 15000,
    });

    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, "04-mobile-viewport.png"),
      fullPage: true,
    });
    console.log("   ✓ Captured mobile viewport");
    await mobileContext.close();

    console.log("\n✅ All screenshots saved to:", SCREENSHOT_DIR);
    console.log("\nScreenshots:");
    console.log("  1. 01-welcome-empty-state.png");
    console.log("  2. 02-chat-with-messages.png");
    console.log("  3. 03-settings-sidebar-open.png");
    console.log("  4. 04-mobile-viewport.png");
  } catch (error) {
    console.error("\n❌ Error capturing screenshots:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Check if dev server is running
async function checkServer() {
  try {
    const response = await fetch(BASE_URL);
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  const isRunning = await checkServer();
  if (!isRunning) {
    console.error("❌ Dev server is not running at", BASE_URL);
    console.error("Please start it with: npm run dev");
    process.exit(1);
  }

  console.log("✓ Dev server is running at", BASE_URL);
  console.log("Starting screenshot capture...\n");
  await captureScreenshots();
}

main();
