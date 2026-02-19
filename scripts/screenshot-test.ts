import { chromium } from 'playwright';

async function takeScreenshots() {
  const browser = await chromium.launch();
  const viewports = [
    { name: 'mobile-375', width: 375, height: 812 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'desktop-1280', width: 1280, height: 800 },
    { name: 'desktop-1920', width: 1920, height: 1080 },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();

    // Navigate and accept ToS if it appears
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1500);

    // Click "I Accept" button if the ToS overlay is present
    const acceptBtn = page.locator('button:has-text("I Accept")');
    if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await acceptBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    // Set dark theme
    await page.evaluate(() => {
      localStorage.setItem('theme', '"dark"');
    });
    await page.reload();
    await page.waitForTimeout(2000);

    // Click away ToS again if it flashes back after reload
    const acceptBtn2 = page.locator('button:has-text("I Accept")');
    if (await acceptBtn2.isVisible({ timeout: 1000 }).catch(() => false)) {
      await acceptBtn2.click({ force: true });
      await page.waitForTimeout(1000);
    }

    // Screenshot 1: Welcome state (no conversation)
    await page.screenshot({
      path: `scripts/screenshots/${vp.name}-welcome.png`,
      fullPage: false,
    });

    // Screenshot 2: Header close-up (top 80px)
    await page.screenshot({
      path: `scripts/screenshots/${vp.name}-header.png`,
      clip: { x: 0, y: 0, width: vp.width, height: 80 },
    });

    // Screenshot 3: Open text model dropdown (use force to bypass overlay issues)
    const textModelBtn = page.locator('button[aria-label="Select text model"]');
    if (await textModelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await textModelBtn.click({ force: true });
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `scripts/screenshots/${vp.name}-text-dropdown.png`,
        fullPage: false,
      });
      // Close by clicking elsewhere
      await page.mouse.click(10, 10);
      await page.waitForTimeout(300);
    }

    // Screenshot 4: Open image model dropdown
    const imageModelBtn = page.locator('button[aria-label="Select image model"]');
    if (await imageModelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await imageModelBtn.click({ force: true });
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `scripts/screenshots/${vp.name}-image-dropdown.png`,
        fullPage: false,
      });
      await page.mouse.click(10, 10);
      await page.waitForTimeout(300);
    }

    // Screenshot 5: Light theme
    await page.evaluate(() => {
      localStorage.setItem('theme', '"light"');
    });
    await page.reload();
    await page.waitForTimeout(2000);

    // Dismiss ToS if it appears again
    const acceptBtn3 = page.locator('button:has-text("I Accept")');
    if (await acceptBtn3.isVisible({ timeout: 1000 }).catch(() => false)) {
      await acceptBtn3.click({ force: true });
      await page.waitForTimeout(1000);
    }

    await page.screenshot({
      path: `scripts/screenshots/${vp.name}-light.png`,
      fullPage: false,
    });

    // Screenshot 6: Open sidebar (if applicable)
    if (vp.width >= 768) {
      const sidebarToggle = page.locator('button[aria-label="Open sidebar"]');
      if (await sidebarToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sidebarToggle.click({ force: true });
        await page.waitForTimeout(500);
        await page.screenshot({
          path: `scripts/screenshots/${vp.name}-sidebar.png`,
          fullPage: false,
        });
      }
    }

    await context.close();
    console.log(`Done: ${vp.name}`);
  }

  await browser.close();
  console.log('All screenshots saved to scripts/screenshots/');
}

takeScreenshots().catch(console.error);
