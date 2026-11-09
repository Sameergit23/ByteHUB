import { test, expect } from "@playwright/test";

const KEY_PAGES = [
  "/",
  "/about",
  "/internships",
  "/training",
  "/apply/intern-01",
  "/dashboard/student",
  "/dashboard/company",
  "/admin",
  "/contact",
  "/for-companies",
];

const VIEWPORTS = [
  { name: "360px Compact Mobile", width: 360, height: 640 },
  { name: "768px Tablet", width: 768, height: 1024 },
  { name: "1280px Desktop", width: 1280, height: 800 },
];

test.describe("Responsive Zero-Horizontal-Overflow Audit", () => {
  for (const pagePath of KEY_PAGES) {
    for (const vp of VIEWPORTS) {
      test(`Zero horizontal overflow on ${pagePath} at ${vp.name} (${vp.width}px)`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(pagePath);
        await page.waitForLoadState("domcontentloaded");

        // Evaluate whether document scrollWidth exceeds client viewport width
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return {
            scrollWidth: doc.scrollWidth,
            clientWidth: doc.clientWidth,
            hasHorizontalScrollbar: doc.scrollWidth > window.innerWidth,
          };
        });

        expect(
          overflow.hasHorizontalScrollbar,
          `Horizontal overflow detected on ${pagePath} at ${vp.width}px. scrollWidth: ${overflow.scrollWidth}, clientWidth: ${overflow.clientWidth}`
        ).toBe(false);
      });
    }
  }
});
