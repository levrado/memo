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
});
