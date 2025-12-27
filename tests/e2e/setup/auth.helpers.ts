import { Page } from "@playwright/test";

/**
 * Simple ID generator for tests
 */
function generateTestId() {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Helper to generate unique test user credentials
 */
export function generateTestUser() {
  const uniqueId = generateTestId();
  return {
    email: `test-${uniqueId}@example.com`,
    password: "TestPassword123!",
    firstName: "Test",
    lastName: "User",
  };
}

/**
 * Helper to signup a new user
 * Note: Works better in same context; multi-context signup has timing issues
 * due to AuthProvider's async getCurrentUser() check on first load
 */
export async function signupUser(
  page: Page,
  user: { email: string; password: string; firstName: string; lastName: string }
) {
  // Clear any existing state to ensure we're not logged in
  await page.context().clearCookies();
  await page.goto("/signup", { waitUntil: "domcontentloaded" });

  // Wait for the form to be visible and enabled
  const firstNameSelector = "input#firstName";
  await page.waitForSelector(firstNameSelector, { timeout: 15000 });

  // Wait a bit for any loading states to clear
  await page.waitForTimeout(1000);

  // Fill the form
  await page.locator(firstNameSelector).fill(user.firstName);
  await page.locator("input#lastName").fill(user.lastName);
  await page.locator("input#email").fill(user.email);
  await page.locator("input#password").fill(user.password);

  // Wait for the signup API response
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/signup") && response.status() === 201,
    { timeout: 15000 }
  );

  // Submit
  await page.click('button[type="submit"]');

  // Wait for successful signup response
  await responsePromise;

  // Wait for navigation to complete - page goes to / after signup
  await page.waitForURL("/", { timeout: 15000 });

  // Add a small delay to let page fully settle
  await page.waitForTimeout(500);
}

/**
 * Helper to login an existing user
 */
export async function loginUser(page: Page, email: string, password: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 30000 });

  // Wait for the form to be visible
  await page.waitForSelector("input#email", { timeout: 15000 });
  await page.waitForSelector("input#password", { timeout: 15000 });

  // Use id selectors since the forms use id instead of name
  await page.fill("input#email", email);
  await page.fill("input#password", password);

  await page.click('button[type="submit"]');

  // Wait for navigation after login (goes to / first)
  await page.waitForURL("/", { timeout: 15000 });

  // Wait a bit for page to stabilize
  await page.waitForTimeout(500);

  // Click "Go to Boards" button to navigate to boards page
  const goToBoardsButton = page.locator('a[href="/boards"]').first();
  if (await goToBoardsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await goToBoardsButton.click();
    await page.waitForURL("/boards", { timeout: 10000 });
  }
}

/**
 * Helper to log out the current user
 */
export async function logoutUser(page: Page) {
  await page.goto("/logout");
  // The logout route uses window.location.href which may take a moment
  // Wait for either /login or / (unauthenticated home)
  await Promise.race([
    page.waitForURL("/login", { timeout: 10000 }),
    page.waitForURL("/", { timeout: 10000 }),
  ]).catch(() => {
    // If neither works, just wait a bit for the redirect
    return page.waitForTimeout(2000);
  });
}

/**
 * Helper to check if user is authenticated by checking for user menu
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return await page
    .locator('[data-testid="user-menu"]')
    .isVisible()
    .catch(() => false);
}
