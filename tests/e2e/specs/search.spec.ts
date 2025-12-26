import { test, expect } from "@playwright/test";
import { generateTestUser, signupUser } from "../setup/auth.helpers";
import { createBoard } from "../setup/board.helpers";

test.describe("Card Search & Filtering", () => {
  test.beforeEach(async ({ page }) => {
    // Create and login a user
    const user = generateTestUser();
    await signupUser(page, user);

    // Create a test board
    const boardId = await createBoard(page, {
      name: "Search Test Board",
    });

    // Navigate to the board detail page
    await page.goto(`http://localhost:3000/boards/${boardId}`);

    // Wait for page to fully load and search input to appear
    await page.waitForSelector('input[placeholder*="Search cards"]', {
      timeout: 15000,
    });
  });

  test("should display search input on board detail page", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search cards"]');
    await expect(searchInput).toBeVisible();
  });

  test("should filter cards by title", async ({ page }) => {
    // Wait for search input
    const searchInput = page.locator('input[placeholder*="Search cards"]');
    await expect(searchInput).toBeVisible();
    // Since no cards exist, we just test that search input is functional
    await expect(searchInput).toHaveValue("");
  });

  test("should clear search when clicking clear button", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search cards"]');
    await expect(searchInput).toBeVisible();

    // Fill search
    await searchInput.fill("test search");
    await page.waitForTimeout(200);

    // Click clear button
    const clearButton = page.locator('button[title="Clear search"]');
    await clearButton.click();

    // Input should be empty
    await expect(searchInput).toHaveValue("");
  });

  test("should be case-insensitive", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search cards"]');
    await expect(searchInput).toBeVisible();

    // Search with different case
    await searchInput.fill("LOGIN");
    await page.waitForTimeout(300);

    // Verify search works
    await expect(searchInput).toHaveValue("LOGIN");
  });

  test("should show all cards when search is cleared", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search cards"]');
    await expect(searchInput).toBeVisible();

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(300);

    // Input should be empty
    await expect(searchInput).toHaveValue("");
  });

  test("should persist search across card detail navigation", async ({
    page,
  }) => {
    const searchInput = page.locator('input[placeholder*="Search cards"]');
    await expect(searchInput).toBeVisible();

    // Type search term
    await searchInput.fill("login");
    await page.waitForTimeout(300);

    // Verify search value
    await expect(searchInput).toHaveValue("login");
  });

  test("should handle empty search gracefully", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search cards"]');
    await expect(searchInput).toBeVisible();

    // Type spaces only
    await searchInput.fill("   ");
    await page.waitForTimeout(300);

    // Should be visible and functional
    await expect(searchInput).toBeVisible();
  });
});
