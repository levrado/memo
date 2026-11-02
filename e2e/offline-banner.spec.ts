import { test, expect } from "./fixtures/auth";

test.describe("offline connectivity banner", () => {
  test("appears when the browser goes offline and dismisses on reconnect", async ({
    authenticatedPage: page,
  }) => {
    const banner = page.getByTestId("as-offline-banner");

    // Online by default — no banner rendered
    await expect(banner).toHaveCount(0);

    // Emulate losing connectivity — the browser fires the `offline` event
    await page.context().setOffline(true);
    await expect(banner).toBeVisible();
    await expect(banner).toHaveText(/offline/i);
    await expect(banner).toHaveText(/changes may not be saved/i);

    // Non-blocking: the main content area stays interactive
    await expect(page.locator("main#main-content")).toBeVisible();

    // Reconnect — the `online` event dismisses the banner without reload
    await page.context().setOffline(false);
    await expect(banner).toHaveCount(0);
  });

  test("keeps the message inside the h-8 strip on narrow viewports", async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const banner = page.getByTestId("as-offline-banner");
    const message = banner.locator("span");

    await page.context().setOffline(true);
    await expect(banner).toBeVisible();

    // Regression for #23: at 375px the ~63-char message wrapped to two lines
    // and rendered outside the fixed h-8 strip, below its border. The message
    // must stay on one line and within the banner's bounds (it truncates).
    const bannerBox = await banner.boundingBox();
    const messageBox = await message.boundingBox();
    expect(bannerBox).not.toBeNull();
    expect(messageBox).not.toBeNull();
    // A single line of text-xs is ~16px; two wrapped lines would be ~32px.
    expect(messageBox!.height).toBeLessThanOrEqual(20);
    expect(messageBox!.y).toBeGreaterThanOrEqual(bannerBox!.y);
    expect(messageBox!.y + messageBox!.height).toBeLessThanOrEqual(
      bannerBox!.y + bannerBox!.height,
    );
  });
});
