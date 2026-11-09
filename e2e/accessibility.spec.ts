import { test, expect } from "@playwright/test";

const AUDIT_PAGES = [
  "/",
  "/about",
  "/internships",
  "/training",
  "/contact",
  "/for-companies",
  "/auth",
];

test.describe("WCAG 2.2 AA Accessibility Audits", () => {
  for (const pagePath of AUDIT_PAGES) {
    test(`Accessibility compliance on ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath);
      await page.waitForLoadState("domcontentloaded");

      // Verify skip-to-content link exists for keyboard navigation
      const skipLink = page.locator('a[href="#main-content"]');
      await expect(skipLink).toBeAttached();

      // Verify page has proper html lang attribute
      const lang = await page.getAttribute("html", "lang");
      expect(lang).toBe("en");

      // Verify main landmark
      const mainLandmark = page.locator("main");
      await expect(mainLandmark).toBeAttached();

      // Verify images have alt attributes
      const imagesWithoutAlt = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll("img"));
        return imgs.filter((img) => !img.hasAttribute("alt")).length;
      });
      expect(imagesWithoutAlt).toBe(0);

      // Verify buttons have accessible text names
      const buttonsWithoutLabels = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        return btns.filter(
          (btn) =>
            !btn.innerText.trim() &&
            !btn.getAttribute("aria-label") &&
            !btn.getAttribute("aria-labelledby")
        ).length;
      });
      expect(buttonsWithoutLabels).toBe(0);
    });
  }
});
