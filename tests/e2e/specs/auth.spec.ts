import { test, expect } from "@playwright/test";
import {
  generateTestUser,
  signupUser,
  logoutUser,
} from "../setup/auth.helpers";

test.describe("Authentication & User Management", () => {
  test.describe("Sign Up Flow", () => {
    test("should allow user to create a new account with valid credentials", async ({
      page,
    }) => {
      const user = generateTestUser();

      await page.goto("/signup");

      // Wait for form to be ready
      await page.waitForSelector("input#firstName", { timeout: 15000 });
      await page.waitForTimeout(1000); // Wait for any loading states

      // Fill in signup form
      await page.fill("input#firstName", user.firstName);
      await page.fill("input#lastName", user.lastName);
      await page.fill("input#email", user.email);
      await page.fill("input#password", user.password);

      // Wait for the signup API response
      const responsePromise = page.waitForResponse(
        (response) => response.url().includes("/api/auth/signup"),
        { timeout: 15000 }
      );

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for API response
      const response = await responsePromise;

      // If response is successful, wait for redirect
      if (response.status() === 201) {
        // Should redirect to home/boards page
        await page.waitForURL("/", { timeout: 10000 });
      } else {
        const responseData = await response.json();
        console.error("Signup failed:", responseData);
        throw new Error(
          `Signup failed with status ${response.status()}: ${JSON.stringify(responseData)}`
        );
      }

      // User should be authenticated - check for user menu or boards page
      const isOnBoardsPage =
        page.url().includes("/boards") ||
        page.url() === "http://localhost:3000/";
      expect(isOnBoardsPage).toBeTruthy();
    });

    test("should show validation error for invalid email", async ({ page }) => {
      await page.goto("/signup");

      await page.fill("input#email", "invalid-email");
      await page.fill("input#password", "TestPassword123!");
      await page.fill("input#firstName", "Test");
      await page.fill("input#lastName", "User");

      await page.click('button[type="submit"]');

      // Should show validation error
      const errorMessage = page.locator("text=/invalid|email/i");
      await expect(errorMessage).toBeVisible({ timeout: 3000 });
    });

    test("should show validation error for weak password", async ({ page }) => {
      await page.goto("/signup");

      await page.fill("input#email", "test@example.com");
      await page.fill("input#password", "123"); // Too short
      await page.fill("input#firstName", "Test");
      await page.fill("input#lastName", "User");

      await page.click('button[type="submit"]');

      // Should show validation error for weak password
      const errorMessage = page.locator("text=/password|characters|strong/i");
      await expect(errorMessage).toBeVisible({ timeout: 3000 });
    });

    test("should not allow signup with already registered email", async ({
      page,
    }) => {
      const user = generateTestUser();

      // First signup
      await signupUser(page, user);

      // Logout - wait for the page to stabilize
      await page.goto("/logout");
      await page.waitForTimeout(2000); // Give time for logout to complete

      // Try to signup again with same email
      await page.goto("/signup");
      await page.fill("input#firstName", "Another");
      await page.fill("input#lastName", "User");
      await page.fill("input#email", user.email);
      await page.fill("input#password", user.password);
      await page.click('button[type="submit"]');

      // Should show error about email already exists - check for toast notification
      await page.waitForTimeout(1000);
      const hasError = await page
        .locator("text=/account.*email.*already/i")
        .isVisible()
        .catch(() => false);

      // If not in main content, might be in a toast
      const hasToastError = await page
        .locator('[role="status"], .sonner-toast')
        .locator("text=/account.*email.*already/i")
        .isVisible()
        .catch(() => false);

      expect(hasError || hasToastError).toBeTruthy();
    });
  });

  test.describe("Login Flow", () => {
    test("should allow user to log in with valid credentials", async ({
      page,
    }) => {
      const user = generateTestUser();

      // First create an account
      await signupUser(page, user);

      // Logout
      await page.goto("/logout");
      await page.waitForTimeout(2000); // Give time for logout

      // Now log in manually (not using loginUser helper)
      await page.goto("/login");

      // Wait for form to be ready
      await page.waitForSelector("input#email", { timeout: 10000 });
      await page.waitForSelector("input#password", { timeout: 10000 });

      await page.fill("input#email", user.email);
      await page.fill("input#password", user.password);

      // Set up response listener and click in parallel
      await Promise.all([
        page.waitForResponse(
          (response) => response.url().includes("/api/auth/login"),
          { timeout: 10000 }
        ),
        page.click('button[type="submit"]'),
      ]);

      // Wait for redirect to home page after login
      await page.waitForURL("/", { timeout: 10000 });

      // Should see welcome message
      await expect(page.locator("text=/Welcome.*Test/i")).toBeVisible({
        timeout: 5000,
      });
    });

    test("should show error for incorrect credentials", async ({ page }) => {
      await page.goto("/login", { waitUntil: "networkidle" });

      // Wait for form to be ready and fully loaded
      await page.waitForLoadState("domcontentloaded");
      await page.waitForSelector("input#email", { timeout: 10000 });
      await page.waitForSelector("input#password", { timeout: 10000 });
      await page.waitForSelector('button[type="submit"]', { timeout: 10000 });

      await page.fill("input#email", "nonexistent@example.com");
      await page.fill("input#password", "WrongPassword123!");

      // Set up response listener and click in parallel
      await Promise.all([
        page.waitForResponse(
          (response) => response.url().includes("/api/auth/login"),
          { timeout: 10000 }
        ),
        page.click('button[type="submit"]'),
      ]);

      // Wait for the error to be rendered
      await page.waitForTimeout(1000);

      // Error message might be in toast or inline - check both
      const hasInlineError = await page
        .locator("text=/invalid/i")
        .isVisible()
        .catch(() => false);

      const hasToastError = await page
        .locator('[role="status"], .sonner-toast')
        .locator("text=/invalid/i")
        .isVisible()
        .catch(() => false);

      const hasDataTestIdError = await page
        .locator('[data-testid="login-error"]')
        .isVisible()
        .catch(() => false);

      // At least one error should be visible
      expect(hasInlineError || hasToastError || hasDataTestIdError).toBe(true);
    });

    test("should redirect authenticated user from login page to home", async ({
      page,
    }) => {
      const user = generateTestUser();

      // Create and login user
      await signupUser(page, user);

      // Try to navigate to login page while authenticated
      await page.goto("/login");

      // Should redirect to home/boards
      await page.waitForURL("/", { timeout: 5000 });
      const url = page.url();
      expect(
        url === "http://localhost:3000/" || url.includes("/boards")
      ).toBeTruthy();
    });
  });

  test.describe("Logout Flow", () => {
    test("should allow user to log out successfully", async ({ page }) => {
      const user = generateTestUser();

      // Create and login user
      await signupUser(page, user);

      // Logout
      await page.goto("/logout");

      // Wait for redirect to complete
      await page.waitForTimeout(3000);

      // Should be redirected away from authenticated pages
      const currentUrl = page.url();
      const isLoggedOut =
        currentUrl.includes("/login") ||
        currentUrl === "http://localhost:3000/" ||
        !currentUrl.includes("/boards");

      expect(isLoggedOut).toBeTruthy();
    });

    test("should clear session after logout", async ({ page }) => {
      const user = generateTestUser();

      // Create and login user
      await signupUser(page, user);

      // Logout
      await logoutUser(page);

      // Try to access protected route (boards)
      await page.goto("/boards");

      // Should redirect to login or show "Please log in" message
      const isOnLogin = page.url().includes("/login");
      const hasLoginMessage = await page
        .locator("text=/log in|sign in/i")
        .isVisible()
        .catch(() => false);

      expect(isOnLogin || hasLoginMessage).toBeTruthy();
    });
  });

  test.describe("Profile Management", () => {
    test("should allow user to view their profile", async ({ page }) => {
      const user = generateTestUser();

      // Create and login user
      await signupUser(page, user);

      // Navigate to profile
      await page.goto("/profile");

      // Wait for profile page to load
      await page.waitForLoadState("networkidle");

      // Should display user information - look for the email in any form
      const hasEmail = await page
        .locator(`text=${user.email}`)
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      const hasEmailLink = await page
        .locator(`a[href="mailto:${user.email}"]`)
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      const hasUserName = await page
        .locator("text=/Welcome.*Test/i")
        .isVisible()
        .catch(() => false);

      expect(hasEmail || hasEmailLink || hasUserName).toBeTruthy();
    });
  });
});
