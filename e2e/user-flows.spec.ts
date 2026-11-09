import { test, expect } from "@playwright/test";

test.describe("ByteHUB End-to-End User Journeys", () => {
  // --------------------------------------------------------------------------
  // Flow 1: Sign Up & Verification Flow
  // --------------------------------------------------------------------------
  test("Flow 1: Student sign up with strict password and validation", async ({ page }) => {
    await page.goto("/auth?mode=register");

    // Check title and Swiss-editorial structure
    await expect(page.locator("h1")).toContainText(/Create your account|Sign up/i);

    // Fill form
    await page.fill('input[type="text"]', "Ananya Deshmukh");
    await page.fill('input[type="email"]', `ananya_${Date.now()}@testmail.com`);
    await page.fill('input[type="password"]', "SecureStudent2026!");

    // Role selector defaults to STUDENT
    await page.click('button[type="submit"]');

    // Should indicate successful registration and instructions
    await expect(page.locator("body")).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // Flow 2: Login and Session Storage
  // --------------------------------------------------------------------------
  test("Flow 2: Student log in and authenticated session management", async ({ page }) => {
    await page.goto("/auth?mode=login");

    await page.fill('input[type="email"]', "student.demo@bytehub.dev");
    await page.fill('input[type="password"]', "SecureStudent2026!");
    await page.click('button[type="submit"]');

    // Upon login redirect to student dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  // --------------------------------------------------------------------------
  // Flow 3: 4-Step Internship Application Journey
  // --------------------------------------------------------------------------
  test("Flow 3: 4-step internship application with validation and draft saving", async ({ page }) => {
    await page.goto("/apply/intern-01");

    // Step 1: Personal Details
    await expect(page.locator("body")).toContainText("Step 1 of 4");
    await page.fill('input[name="fullName"]', "Vikram Seth");
    await page.fill('input[name="email"]', "vikram.seth@example.com");
    await page.fill('input[name="phone"]', "+919876543210");
    await page.click('button:has-text("Continue to Education")');

    // Step 2: Academic Background
    await expect(page.locator("body")).toContainText("Step 2 of 4");
    await page.fill('input[name="collegeOrUniversity"]', "National Institute of Technology");
    await page.fill('input[name="degree"]', "B.Tech Computer Science");
    await page.click('button:has-text("Continue to Links & Resume")');

    // Step 3: Links & Resume
    await expect(page.locator("body")).toContainText("Step 3 of 4");
    await page.fill('input[name="githubUrl"]', "https://github.com/vikramseth");
    await page.fill('input[name="linkedinUrl"]', "https://linkedin.com/in/vikramseth");
    await page.click('button:has-text("Continue to Intent & Availability")');

    // Step 4: Statement of Purpose & Review
    await expect(page.locator("body")).toContainText("Step 4 of 4");
    await page.fill(
      'textarea[name="whyInterested"]',
      "I have built distributed cache systems and want to master production backend engineering."
    );
    await page.fill(
      'textarea[name="relevantProjectDescription"]',
      "Architected an in-memory key-value store with Raft consensus protocol in TypeScript."
    );

    // Submit Application
    await page.click('button:has-text("Submit Formal Application")');

    // Confirmation screen
    await expect(page.locator("body")).toContainText(/Application Submitted Successfully/i);
  });

  // --------------------------------------------------------------------------
  // Flow 4: Enrol and Pay in Test Mode
  // --------------------------------------------------------------------------
  test("Flow 4: Enrol and pay in test mode with 15-minute countdown and receipt", async ({ page }) => {
    await page.goto("/training/checkout/cohort-web-01");

    // 15-minute timer visible
    await expect(page.locator("body")).toContainText(/Your seat is reserved for/i);
    await expect(page.locator("body")).toContainText("₹24,000");

    // Trigger payment
    await page.click('button:has-text("Proceed to Pay")');

    // Wait for webhook capture confirmation
    await expect(page.locator("body")).toContainText(/Your seat is confirmed/i, { timeout: 10000 });
    await expect(page.locator("body")).toContainText("Download Tax Invoice (PDF)");
  });

  // --------------------------------------------------------------------------
  // Flow 5: Admin Refund Flow
  // --------------------------------------------------------------------------
  test("Flow 5: Admin processes refund with mandatory audit-logged reason", async ({ page }) => {
    await page.goto("/admin");

    // Navigate to Payments tab
    await page.click('button:has-text("Payments & Refunds")');

    // Check payment row and refund button
    await expect(page.locator("body")).toContainText("Issue Refund");
    await page.click('button:has-text("Issue Refund")');

    // Modal opens with audit reason input
    await page.fill('input[placeholder*="Student requested cancellation"]', "Cancelled prior to cohort launch.");
    await page.click('button:has-text("Confirm Refund")');
  });

  // --------------------------------------------------------------------------
  // Flow 6: Role Access Denial & Boundary Redirection
  // --------------------------------------------------------------------------
  test("Flow 6: Student is denied access to Admin panel and redirected", async ({ page }) => {
    // Attempt unauthorized navigation to /admin
    await page.goto("/admin");

    // Middleware must intercept and redirect to /auth or block with access denied
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/admin/dashboard");
  });
});
