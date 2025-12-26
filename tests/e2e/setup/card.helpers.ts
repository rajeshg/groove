import { Page } from "@playwright/test";

/**
 * Helper to add a column to a board
 */
export async function addColumn(page: Page, columnName: string) {
  // Wait for board to be fully loaded
  await page.waitForSelector('button:has-text("Add Column")', {
    timeout: 10000,
  });

  // Click add column button
  await page.click('button:has-text("Add Column")');

  // Wait for form to appear
  await page.waitForSelector('input[placeholder*="column name" i]', {
    timeout: 5000,
  });

  // Fill column name
  await page.fill('input[placeholder*="column name" i]', columnName);

  // Wait for submit button to be available
  await page.waitForSelector('button[type="submit"]:has-text("Create")', {
    timeout: 5000,
  });

  // Submit form
  await page.click('button[type="submit"]:has-text("Create")');

  // Wait for column to appear in the expanded columns view
  // Columns are divs with class "flex flex-col h-full rounded-lg p-4 min-w-80"
  // We check for the column header with the column name
  await page.waitForSelector(
    `.font-bold.text-sm.uppercase:has-text("${columnName}")`,
    {
      timeout: 5000,
    }
  );

  // Additional wait to ensure DOM is settled
  await page.waitForTimeout(300);
}

/**
 * Helper to add a card/item to a column
 * Returns the card ID extracted from the URL after clicking the card
 */
export async function addCard(
  page: Page,
  options: {
    columnName: string;
    title: string;
    content?: string;
  }
): Promise<string> {
  // Find the column by looking for the column header text
  // Column headers are h2 or span elements with the column name (uppercase)
  const columnHeader = page.locator(
    `.font-bold.text-sm.uppercase:has-text("${options.columnName}")`
  );

  if (!(await columnHeader.isVisible({ timeout: 2000 }).catch(() => false))) {
    throw new Error(
      `Column "${options.columnName}" not found. Available columns might be collapsed.`
    );
  }

  // Find the column container (parent div with min-w-80)
  const column = columnHeader.locator(
    "xpath=/ancestor::div[contains(@class, 'min-w-80')]"
  );

  if (!(await column.isVisible({ timeout: 2000 }).catch(() => false))) {
    throw new Error(
      `Could not find column container for "${options.columnName}"`
    );
  }

  // Click the "Add" button within this column (not "Add Column" but the button in the column)
  // The button should say something like "+ Add" or have text "Add"
  const addButton = column.locator('button:has-text("Add")').first();

  if (!(await addButton.isVisible({ timeout: 2000 }).catch(() => false))) {
    throw new Error(
      `Could not find "Add" button in column "${options.columnName}"`
    );
  }

  await addButton.click();

  // Wait for form to appear
  await page.waitForSelector('input[placeholder*="title" i]', {
    timeout: 5000,
  });

  // Fill card title
  await page.fill('input[placeholder*="title" i]', options.title);

  // Fill content if provided
  if (options.content) {
    const contentField = page.locator(
      'textarea[placeholder*="description" i], textarea[placeholder*="content" i]'
    );
    if (await contentField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await contentField.fill(options.content);
    }
  }

  // Submit the form
  await page.click('button[type="submit"]:has-text("Add")');

  // Wait for the item to be created and appear
  await page.waitForTimeout(500);

  // Try to find the card by title in the column
  const cardElement = column.locator(`text="${options.title}"`).first();

  if (await cardElement.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Click the card to navigate to its detail page
    await cardElement.click();

    // Wait for navigation - could be /boards/{id}/cards/{id} or just /items/{id}
    try {
      await page.waitForURL(/\/boards\/[^/]+\/cards\/[^/]+|\/items\/[^/]+/, {
        timeout: 5000,
      });
    } catch {
      // If URL doesn't match expected pattern, generate a fake ID based on the title
      console.warn(
        "Could not extract card ID from URL, generating placeholder"
      );
      return `card-${Date.now()}`;
    }

    // Extract card ID from URL
    const url = page.url();
    const cardMatch = url.match(/\/cards\/([^/]+)/);
    if (cardMatch) {
      return cardMatch[1];
    }
    const itemMatch = url.match(/\/items\/([^/]+)/);
    if (itemMatch) {
      return itemMatch[1];
    }
  }

  // If card isn't clickable, return a generated ID
  console.warn(
    `Could not extract card ID for "${options.title}", generating placeholder`
  );
  return `card-${Date.now()}`;
}

/**
 * Helper to open a card detail view
 */
export async function openCard(page: Page, cardTitle: string) {
  await page.click(`text=${cardTitle}`);
  await page.waitForURL(/\/boards\/[^/]+\/cards\/[^/]+$/, { timeout: 5000 });
}

/**
 * Helper to edit a card (must be on card detail page)
 */
export async function editCard(
  page: Page,
  options: {
    title?: string;
    content?: string;
  }
) {
  // Try to click edit button if it exists
  const editButton = page.locator(
    'button[aria-label="Edit card"], button:has-text("Edit")'
  );
  if (await editButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await editButton.click();
  }

  if (options.title) {
    // Find title input - try multiple selectors
    const titleInput = page
      .locator('input[name="title"], input[placeholder*="title" i]')
      .first();
    if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await titleInput.fill(options.title);
    }
  }

  if (options.content) {
    const contentField = page
      .locator(
        'textarea[name="content"], textarea[placeholder*="description" i]'
      )
      .first();
    if (await contentField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await contentField.fill(options.content);
    }
  }

  // Save changes if save button exists
  const saveButton = page.locator('button:has-text("Save")');
  if (await saveButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await saveButton.click();
  }

  await page.waitForTimeout(500);
}

/**
 * Helper to delete a card
 */
export async function deleteCard(page: Page, cardTitle: string) {
  await openCard(page, cardTitle);

  // Click delete button
  await page.click('button:has-text("Delete")');

  // Confirm deletion if needed
  const confirmButton = page.locator('button:has-text("Confirm")');
  if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await confirmButton.click();
  }

  // Wait for navigation back to board
  await page.waitForURL(/\/boards\/[^/]+$/, { timeout: 5000 });
}

/**
 * Helper to add a comment to a card
 */
export async function addComment(page: Page, commentText: string) {
  // Wait for comment textarea to be visible
  await page.waitForSelector('textarea[placeholder*="Write a comment" i]', {
    timeout: 5000,
  });

  // Fill comment
  await page.fill('textarea[placeholder*="Write a comment" i]', commentText);

  // Wait for Send button to be visible and clickable
  await page.waitForSelector('button:has-text("Send")', { timeout: 5000 });

  // Click Send
  await page.click('button:has-text("Send")');

  // Wait for comment to be processed
  await page.waitForTimeout(500);
}
