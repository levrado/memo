import { test, expect } from "@playwright/test";

/**
 * Paste HTML into the editor via a synthetic clipboard event. This mirrors
 * pasting HTML copied from a rendered Memo page (or another editor) when the
 * application/x-lexical-editor payload is unavailable — e.g. Safari or
 * cross-application copy. The editor's importDOM implementations decide
 * which block types the pasted elements become.
 */
async function pasteHtml(
  page: import("@playwright/test").Page,
  html: string,
  plainText: string,
) {
  await page.evaluate(
    ({ htmlData, textData }) => {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData("text/html", htmlData);
      dataTransfer.setData("text/plain", textData);

      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer,
      });

      const editor = document.querySelector('[data-lexical-editor="true"]');
      if (!editor) throw new Error("Editor not found");
      editor.dispatchEvent(pasteEvent);
    },
    { htmlData: html, textData: plainText },
  );
}

test.describe("HTML paste preserves custom block types", () => {
  test.beforeEach(async ({ page }) => {
    // The landing-page demo editor is unauthenticated and registers the
    // callout + collapsible nodes. Clear its sessionStorage persistence so
    // each test starts empty.
    await page.goto("/");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="demo-editor"]', {
      timeout: 15_000,
    });
  });

  test("pasting exported callout HTML restores a callout block", async ({
    page,
  }) => {
    const editor = page.locator(
      '[data-testid="demo-editor"] [contenteditable="true"]',
    );
    await editor.click();

    await pasteHtml(
      page,
      '<div class="callout" data-variant="warning" data-emoji="⚠️">Pasted warning</div>',
      "Pasted warning",
    );

    const callout = page.locator('[data-testid="editor-callout"]');
    await expect(callout).toBeVisible({ timeout: 5_000 });
    await expect(callout).toContainText("Pasted warning");
    await expect(callout.getByTestId("editor-callout-emoji")).toHaveText("⚠️");
  });

  test("pasting exported collapsible HTML restores toggle structure", async ({
    page,
  }) => {
    const editor = page.locator(
      '[data-testid="demo-editor"] [contenteditable="true"]',
    );
    await editor.click();

    await pasteHtml(
      page,
      "<details open><summary>Pasted title</summary>" +
        '<div data-lexical-collapsible-content="true"><p>Pasted content</p></div>' +
        "</details>",
      "Pasted title\nPasted content",
    );

    const details = page.locator(
      '[data-testid="demo-editor"] details[data-testid="editor-collapsible"]',
    );
    await expect(details).toBeVisible({ timeout: 5_000 });

    const summary = details.locator("summary");
    await expect(summary).toContainText("Pasted title");

    const content = details.locator("summary + div");
    await expect(content).toContainText("Pasted content");
  });

  test("mounting the demo editor emits no importDOM warnings", async ({
    page,
  }) => {
    const warnings: string[] = [];
    page.on("console", (msg) => {
      if (
        msg.type() === "warning" &&
        msg.text().includes('should implement "importDOM"')
      ) {
        warnings.push(msg.text());
      }
    });

    // Trigger a fresh mount of the editor.
    await page.reload();
    await page.waitForSelector(
      '[data-testid="demo-editor"] [data-lexical-editor="true"]',
      { timeout: 15_000 },
    );

    expect(warnings).toHaveLength(0);
  });
});
