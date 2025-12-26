import { Page } from "@playwright/test";

/**
 * Helper to create a new board
 */
export async function createBoard(
  page: Page,
  options: {
    name: string;
    color?: string;
    template?: string;
  }
) {
  await page.goto("/boards/new");

  // Wait for the page to fully load and input to be visible
  // If redirected away, this will timeout (which is fine - means not authenticated)
  await page.waitForSelector('input[placeholder*="Vacation"]', {
    timeout: 15000,
  });

  // Fill board name using the actual placeholder text
  await page.fill('input[placeholder*="Vacation"]', options.name);

  // Select color if provided
  if (options.color) {
    await page.click(`button[data-color="${options.color}"]`);
  }

  // Select template if provided
  if (options.template) {
    // Click the label that wraps the radio input for the template
    const templateLabel = page.locator(
      `label:has(input[name="template"][value="${options.template}"])`
    );
    if (await templateLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await templateLabel.click();
      await page.waitForTimeout(500);
    }
  }

  // Submit form - button says "Create Project"
  await page.click('button[type="submit"]:has-text("Create Project")');

  // Wait for navigation to board page (should be /boards/{uuid} not /boards/new)
  // The board ID should be a UUID-like string, not "new"
  await page.waitForURL(/\/boards\/(?!new)[a-zA-Z0-9-]+$/, { timeout: 10000 });

  // Extract board ID from URL
  const url = page.url();
  const boardId = url.split("/boards/")[1];
  return boardId;
}

/**
 * Helper to delete a board
 */
export async function deleteBoard(page: Page, boardName: string) {
  await page.goto("/boards");

  // Find the board card and hover to reveal delete button
  const boardCard = page
    .locator(`text=${boardName}`)
    .locator("..")
    .locator("..");
  await boardCard.hover();

  // Click delete button
  await boardCard.locator('button[title="Delete board"]').click();

  // Wait for board to be removed
  await page.waitForTimeout(500);
}

/**
 * Helper to navigate to a specific board
 */
export async function navigateToBoard(page: Page, boardId: string) {
  await page.goto(`/boards/${boardId}`);
  await page.waitForLoadState("networkidle");
}

/**
 * Helper to update board settings
 */
export async function updateBoardSettings(
  page: Page,
  boardId: string,
  options: {
    name?: string;
    color?: string;
  }
) {
  await page.goto(`/boards/${boardId}/settings`);

  if (options.name) {
    await page.fill("input#boardName", options.name);
  }

  if (options.color) {
    await page.click(`button[data-color="${options.color}"]`);
  }

  await page.click('button[type="submit"]:has-text("Save")');
  await page.waitForURL(`/boards/${boardId}`, { timeout: 5000 });
}
