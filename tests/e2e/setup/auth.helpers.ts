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
  // Navigate to signup with domcontentloaded (faster than networkidle)
  // This ensures HTML is parsed but doesn't wait for all network requests
  await page.goto("/signup", { waitUntil: "domcontentloaded", timeout: 30000 });

  // Add extra delay to let React mount and AuthProvider check auth status
  // This is the key: AuthProvider needs time to run getCurrentUser() and set isLoading=false
  await page.waitForTimeout(1500);

  // Wait for the form to be visible
  // Use shorter timeout first, with retry mechanism
  const firstNameSelector = "input#firstName";
  let formVisible = false;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Check if page is still valid (not closed)
      if (page.isClosed()) {
        throw new Error("Page was closed before form could be found");
      }

      // Use waitForFunction to check if input exists and is visible in DOM
      await page.waitForFunction(
        (selector) => {
          const el = document.querySelector(selector) as HTMLInputElement;
          return el !== null && el.offsetParent !== null;
        },
        firstNameSelector,
        { timeout: 5000 }
      );
      formVisible = true;
      break;
    } catch (error) {
      if (page.isClosed()) {
        throw new Error("Page was closed during signup form wait");
      }
      if (attempt < 2) {
        console.warn(`Form not visible on attempt ${attempt + 1}, retrying...`);
        // Use a shorter timeout in retry logic
        try {
          await page.waitForTimeout(500);
        } catch {
          // Ignore timeout errors during retry waits
        }
      } else {
        console.error("Form visibility check failed:", error);
      }
    }
  }

  if (!formVisible) {
    throw new Error(
      `Signup form not visible after 3 attempts on ${page.url()}`
    );
  }

  // Fill the form
  await page.locator(firstNameSelector).fill(user.firstName);
  await page.locator("input#lastName").fill(user.lastName);
  await page.locator("input#email").fill(user.email);
  await page.locator("input#password").fill(user.password);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for navigation to complete - page goes to / after signup
  try {
    await page.waitForURL("/", { timeout: 15000 });
  } catch (error) {
    if (page.isClosed()) {
      throw new Error("Page closed after signup submission");
    }
    console.warn("Navigation to home failed:", error);
  }

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
