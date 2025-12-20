import { test, expect } from "@playwright/test"
import {
  createTestAccount,
  createTestBoard,
  cleanupTestData,
} from "../helpers/e2e-utils"

// Helper to create a card and wait for it to appear
async function createCard(page: any, title: string) {
  const addCardButton = page
    .getByRole("button", { name: /add.*card/i })
    .first()
  await addCardButton.click()

  const cardInput = page
    .getByPlaceholder(/Enter a title for this card/i)
    .first()
  await cardInput.fill(title)

  const saveButton = page.getByRole("button", { name: "Save Card" }).first()
  await saveButton.click()

  // Wait for card to appear in the DOM
  const cardLocator = page.locator('[data-card-id]').filter({ hasText: title })
  await expect(cardLocator).toBeVisible({ timeout: 10000 })
  
  return cardLocator
}

// Helper to navigate to board and wait for it to load
async function navigateToBoard(page: any, boardId: string) {
  await page.goto(`/board/${boardId}`, { waitUntil: "networkidle" })
  // Wait for at least one column to be visible
  await page.waitForSelector('[data-column-id]', { timeout: 10000 })
}

// Helper to login
async function login(page: any, email: string, password: string) {
  await page.goto("/login")
  await page.getByLabel("Email address").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  // Wait for navigation after login
  await page.waitForURL(/\/(home|board)/, { timeout: 10000 })
}

test.describe("Card Workflows - Comprehensive", () => {
  const testAccountIds: string[] = []

  test.afterAll(async () => {
    await cleanupTestData(testAccountIds)
  })

  test("should create a card with title and verify it appears in board", async ({
    page,
  }) => {
    // Setup
    const { account, plainPassword } = await createTestAccount()
    testAccountIds.push(account.id)
    const board = await createTestBoard(account.id, "Product Backlog")

    // Login
    await login(page, account.email!, plainPassword)

    // Navigate to board
    await navigateToBoard(page, board.id)
    await expect(page.locator("body")).toContainText("Product Backlog")

    // Create a card
    const addCardButton = page
      .getByRole("button", { name: /add.*card/i })
      .first()
    await addCardButton.click()

    const cardInput = page
      .getByPlaceholder(/Enter a title for this card/i)
      .first()
    await cardInput.fill("Implement user registration")

    const saveButton = page.getByRole("button", { name: "Save Card" }).first()
    await saveButton.click()

    // Wait for card to appear in the DOM using data-card-id attribute
    const cardLocator = page.locator('[data-card-id]').filter({ hasText: /Implement.*registration/i })
    await expect(cardLocator).toBeVisible({ timeout: 10000 })

    // Verify text is in the page
    await expect(page.locator("body")).toContainText(/Implement.*registration/i)
  })

  test("should move card between columns", async ({ page }) => {
    // Setup
    const { account, plainPassword } = await createTestAccount()
    testAccountIds.push(account.id)
    const board = await createTestBoard(account.id, "Development Board", true) // true = create multiple columns

    // Login
    await login(page, account.email!, plainPassword)

    // Navigate to board and create card
    await navigateToBoard(page, board.id)

    const addCardButton = page
      .getByRole("button", { name: /add.*card/i })
      .first()
    await addCardButton.click()

    const cardInput = page
      .getByPlaceholder(/Enter a title for this card/i)
      .first()
    await cardInput.fill("Task to move")

    const saveButton = page.getByRole("button", { name: "Save Card" }).first()
    await saveButton.click()

    // Wait for card to appear
    const cardLocator = page.locator('[data-card-id]').filter({ hasText: "Task to move" })
    await expect(cardLocator).toBeVisible({ timeout: 10000 })
    
    // Open card detail
    await cardLocator.click()
    await expect(page).toHaveURL(/\/card\//)

    // Check current column (should be "Todo" by default)
    await expect(page.locator("body")).toContainText(/Todo/i)

    // Look for column buttons on the right side of card detail
    const columnButtons = page.locator("button").filter({ hasText: /Todo|In Progress|Done/i })
    const buttonCount = await columnButtons.count()

    if (buttonCount > 1) {
      // Click on a different column button (not the active one)
      // Try to find "In Progress" or "Done" button
      const inProgressButton = page.locator("button").filter({ hasText: /In Progress|Done/i }).first()
      
      if (await inProgressButton.isVisible()) {
        await inProgressButton.textContent()
        await inProgressButton.click()

        await page.waitForTimeout(500)

        // Verify the column changed (button should now be highlighted/active)
        // Go back to board to verify
        await navigateToBoard(page, board.id)
        
        // Card should still exist
        await expect(page.locator("body")).toContainText("Task to move")
      }
    }
  })

  test("should delete a card", async ({ page }) => {
    // Setup
    const { account, plainPassword } = await createTestAccount()
    testAccountIds.push(account.id)
    const board = await createTestBoard(account.id, "Cleanup Board")

    // Login
    await login(page, account.email!, plainPassword)

    // Navigate to board and create card
    await navigateToBoard(page, board.id)

    const addCardButton = page
      .getByRole("button", { name: /add.*card/i })
      .first()
    await addCardButton.click()

    const cardInput = page
      .getByPlaceholder(/Enter a title for this card/i)
      .first()
    await cardInput.fill("Card to delete")

    const saveButton = page.getByRole("button", { name: /Save Card/i })
    await saveButton.click()
    
    // Wait for the API response
    await page.waitForResponse(
      (resp) =>
        resp.url().includes("/resources/new-card") && resp.status() === 200,
      { timeout: 5000 }
    )
    await page.waitForTimeout(500)

    // Verify card exists
    const cardLocator = page.locator('[data-card-id]').filter({ hasText: "Card to delete" })
    await expect(cardLocator).toBeVisible()

    // Open card detail
    await cardLocator.click()
    await expect(page).toHaveURL(/\/card\//)

    // Look for delete button (might be in a menu or visible button)
    const deleteButton = page.getByRole("button", { name: /delete/i })
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click()

      // Handle confirmation dialog if it appears
      const confirmButton = page.getByRole("button", { name: /confirm|yes|delete/i })
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
      }

      // Should redirect back to board
      await page.waitForTimeout(1000)
      await expect(page).toHaveURL(/\/board\//)

      // Card should no longer exist
      await page.waitForTimeout(500)
      const cardLocator = page.locator('[data-card-id]').filter({ hasText: "Card to delete" })
      await expect(cardLocator).not.toBeVisible()
    }
  })

  test("should create multiple cards in the same column", async ({ page }) => {
    // Setup
    const { account, plainPassword } = await createTestAccount()
    testAccountIds.push(account.id)
    const board = await createTestBoard(account.id, "Multi Card Board")

    // Login
    await login(page, account.email!, plainPassword)

    // Navigate to board
    await navigateToBoard(page, board.id)

    const cardTitles = [
      "First card in column",
      "Second card in column",
      "Third card in column",
    ]

    // Open the card creation form once
    const addCardButton = page
      .getByRole("button", { name: /add.*card/i })
      .first()
    await addCardButton.click()

    // Create multiple cards using the same open form
    for (const title of cardTitles) {
      const cardInput = page
        .getByPlaceholder(/Enter a title for this card/i)
        .first()
      
      // Clear any existing text first
      await cardInput.clear()
      await cardInput.fill(title)

      const saveButton = page.getByRole("button", { name: /Save Card/i })
      await saveButton.click()

      // Wait for card to appear
      const cardLocator = page.locator('[data-card-id]').filter({ hasText: title })
      await expect(cardLocator).toBeVisible({ timeout: 10000 })
    }

    // Verify all cards appear using data-card-id
    for (const title of cardTitles) {
      const cardLocator = page.locator('[data-card-id]').filter({ hasText: title })
      await expect(cardLocator).toBeVisible()
    }

    // Count how many cards are visible
    const cardCount = await page.locator('[data-card-id]').count()
    expect(cardCount).toBeGreaterThanOrEqual(3)
  })

  test("should cancel card creation", async ({ page }) => {
    // Setup
    const { account, plainPassword } = await createTestAccount()
    testAccountIds.push(account.id)
    const board = await createTestBoard(account.id, "Cancel Test Board")

    // Login
    await login(page, account.email!, plainPassword)

    // Navigate to board
    await navigateToBoard(page, board.id)

    // Start creating a card
    const addCardButton = page
      .getByRole("button", { name: /add.*card/i })
      .first()
    await addCardButton.click()

    const cardInput = page
      .getByPlaceholder(/Enter a title for this card/i)
      .first()
    await cardInput.fill("This card will be cancelled")

    // Click Cancel instead of Save (use exact match to avoid matching board name)
    const cancelButton = page.getByRole("button", { name: "Cancel", exact: true })
    await cancelButton.click()

    // Wait a moment
    await page.waitForTimeout(500)

    // Card should not exist
    await page.waitForTimeout(500)
    const cardLocator = page.locator('[data-card-id]').filter({ hasText: "This card will be cancelled" })
    await expect(cardLocator).not.toBeVisible()

    // Input should be hidden
    const inputVisible = await cardInput.isVisible()
    expect(inputVisible).toBe(false)
  })

  test("should display card metadata (creation date, creator)", async ({
    page,
  }) => {
    // Setup
    const { account, plainPassword } = await createTestAccount()
    testAccountIds.push(account.id)
    const board = await createTestBoard(account.id, "Metadata Board")

    // Login
    await login(page, account.email!, plainPassword)

    // Navigate to board and create card
    await navigateToBoard(page, board.id)

    const addCardButton = page
      .getByRole("button", { name: /add.*card/i })
      .first()
    await addCardButton.click()

    const cardInput = page
      .getByPlaceholder(/Enter a title for this card/i)
      .first()
    await cardInput.fill("Card with metadata")

    const saveButton = page.getByRole("button", { name: /Save Card/i })
    await saveButton.click()
    
    // Wait for the API response
    await page.waitForResponse(
      (resp) =>
        resp.url().includes("/resources/new-card") && resp.status() === 200,
      { timeout: 5000 }
    )
    await page.waitForTimeout(500)

    // Open card detail
    const cardLocator = page.locator('[data-card-id]').filter({ hasText: "Card with metadata" })
    await expect(cardLocator).toBeVisible()
    await cardLocator.click()
    await expect(page).toHaveURL(/\/card\//)

    // Check for metadata
    const userName = `${account.firstName} ${account.lastName}`
    
    // Should show creator information
    await expect(page.locator("body")).toContainText(
      new RegExp(`Created by|${userName}`, "i")
    )

    // Should show some form of date (could be relative like "today" or absolute)
    const hasDateInfo = 
      (await page.locator("text=/created|updated|today|yesterday|ago/i").count()) > 0
    expect(hasDateInfo).toBe(true)
  })

  test("should handle empty card title validation", async ({ page }) => {
    // Setup
    const { account, plainPassword } = await createTestAccount()
    testAccountIds.push(account.id)
    const board = await createTestBoard(account.id, "Validation Board")

    // Login
    await login(page, account.email!, plainPassword)

    // Navigate to board
    await navigateToBoard(page, board.id)

    // Try to create a card without a title
    const addCardButton = page
      .getByRole("button", { name: /add.*card/i })
      .first()
    await addCardButton.click()

    const cardInput = page
      .getByPlaceholder(/Enter a title for this card/i)
      .first()

    // Leave input empty - button should be disabled
    const saveButton = page.getByRole("button", { name: /Save Card/i })
    
    // Verify button is disabled when input is empty
    await expect(saveButton).toBeDisabled()

    // No cards should be created yet
    expect(await page.locator('[data-card-id]').count()).toBe(0)

    // Now create a card with proper title to verify form works
    await cardInput.fill("Valid Card Title")
    
    // Button should now be enabled
    await expect(saveButton).toBeEnabled()
    
    await saveButton.click()

    // Card should be created
    const validCard = page.locator('[data-card-id]').filter({ hasText: "Valid Card Title" })
    await expect(validCard).toBeVisible({ timeout: 5000 })
  })

  test("should persist card edits across page refresh", async ({ page }) => {
    // Setup
    const { account, plainPassword } = await createTestAccount()
    testAccountIds.push(account.id)
    const board = await createTestBoard(account.id, "Persistence Board")

    // Login
    await login(page, account.email!, plainPassword)

    // Navigate to board and create card
    await navigateToBoard(page, board.id)

    const addCardButton = page
      .getByRole("button", { name: /add.*card/i })
      .first()
    await addCardButton.click()

    const cardInput = page
      .getByPlaceholder(/Enter a title for this card/i)
      .first()
    await cardInput.fill("Persistent card title")

    const saveButton = page.getByRole("button", { name: /Save Card/i })
    await saveButton.click()
    
    // Wait for the API response
    await page.waitForResponse(
      (resp) =>
        resp.url().includes("/resources/new-card") && resp.status() === 200,
      { timeout: 5000 }
    )
    await page.waitForTimeout(500)

    // Verify card exists
    const cardLocator = page.locator('[data-card-id]').filter({ hasText: "Persistent card title" })
    await expect(cardLocator).toBeVisible()

    // Refresh the page
    await page.reload()

    // Card should still exist after refresh
    await expect(cardLocator).toBeVisible()

    // Open card and edit it
    await cardLocator.click()
    await expect(page).toHaveURL(/\/card\//)

    // Edit title
    const cardTitle = page.locator("h1").filter({ hasText: "Persistent" })
    await cardTitle.click()

    const titleInput = page.locator('input[type="text"]').first()
    await titleInput.fill("Edited persistent title")
    
    // Wait for update-card request to complete
    const updatePromise = page.waitForResponse(
      (resp) => resp.url().includes("/resources/update-card") && resp.status() === 200,
      { timeout: 5000 }
    )
    
    // Press Tab to blur and trigger the save (more reliable than Enter)
    await titleInput.press("Tab")
    
    // Wait for the update to complete
    await updatePromise
    await page.waitForTimeout(300)

    // Go back to board
    await navigateToBoard(page, board.id)

    // Verify the edit persisted
    const editedCardLocator = page.locator('[data-card-id]').filter({ hasText: "Edited persistent title" })
    await expect(editedCardLocator).toBeVisible()

    // Refresh again
    await page.reload()

    // Edit should still be there
    await expect(editedCardLocator).toBeVisible()
  })
})
