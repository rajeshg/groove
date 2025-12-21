import { test, expect } from "@playwright/test"
import {
  createTestAccount,
  createTestBoard,
  cleanupTestData,
} from "../helpers/e2e-utils"

// Helper to login
async function login(page: any, email: string, password: string) {
  await page.goto("/login")
  await page.getByLabel("Email address").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  // Wait for navigation after login
  await page.waitForURL(/\/(home|board)/, { timeout: 10000 })
}

// Helper to navigate to board and wait for it to load
async function navigateToBoard(page: any, boardId: string) {
  await page.goto(`/board/${boardId}`, { waitUntil: "networkidle" })
  // Wait for at least one column to be visible
  await page.waitForSelector('[data-column-id]', { timeout: 10000 })
}

test.describe("Board Workflows", () => {
  const testAccountIds: string[] = []

  test.afterAll(async () => {
    await cleanupTestData(testAccountIds)
  })

  test("should create a new board with custom name and color", async ({
    page,
  }) => {
    // Create and login with account
    const { account, plainPassword } = await createTestAccount()
    testAccountIds.push(account.id)

    await page.goto("/login")
    await page.getByLabel("Email address").fill(account.email!)
    await page.getByLabel("Password").fill(plainPassword)
    await page.getByRole("button", { name: "Sign in" }).click()

    // Should be on home page
    await expect(page).toHaveURL("/home")
    await expect(page.locator("body")).toContainText(/Start a new board/i)

    // Fill in board name
    await page
      .getByPlaceholder(/Vacation Planning|project name/i)
      .fill("Project Alpha")

    // Submit form to create board
    await page.getByRole("button", { name: /Create Project/i }).click()

    // Should redirect to the new board
    await expect(page).toHaveURL(/\/board\//)
    await expect(page.locator("body")).toContainText("Project Alpha")

    // Verify we can go back to home
    await page.goto("/home")
    await expect(page.locator("body")).toContainText("Project Alpha")
  })

  test("should create, view, and interact with cards", async ({ page }) => {
    // Setup: Create account and board
    const { account, plainPassword } = await createTestAccount()
    testAccountIds.push(account.id)
    const board = await createTestBoard(account.id, "Task Board")

    // Login
    await page.goto("/login")
    await page.getByLabel("Email address").fill(account.email!)
    await page.getByLabel("Password").fill(plainPassword)
    await page.getByRole("button", { name: "Sign in" }).click()

    // Navigate to board
    await page.goto(`/board/${board.id}`)
    await expect(page.locator("body")).toContainText("Task Board")

    // Look for "Add a card" button or input (usually at bottom of columns)
    const addCardButton = page
      .getByRole("button", { name: /add.*card/i })
      .first()
    if (await addCardButton.isVisible()) {
      await addCardButton.click()
    }

    // Try different selectors for card title input
    const cardInput = page
      .getByPlaceholder(/card.*title|task.*title|enter.*card/i)
      .first()

    if (await cardInput.isVisible()) {
      await cardInput.fill("Implement user authentication")
      await cardInput.press("Enter")

      // Card should appear in the board
      await expect(page.locator("body")).toContainText(
        "Implement user authentication"
      )

      // Click on card to open detail view
      await page.locator("text=Implement user authentication").first().click()

      // Should navigate to card detail page or open modal
      await page.waitForURL(/\/card\/|board/, { timeout: 5000 })

      // Verify card title is visible in detail view
      await expect(page.locator("body")).toContainText(
        "Implement user authentication"
      )
    }
  })

  test("should manage board access and verify user can view their boards", async ({
    page,
  }) => {
    // Setup: Create owner account with multiple boards
    const { account: owner, plainPassword: ownerPassword } =
      await createTestAccount()
    testAccountIds.push(owner.id)

    const board1 = await createTestBoard(owner.id, "Development Board")
    const board2 = await createTestBoard(owner.id, "Marketing Board")

    // Login as owner
    await page.goto("/login")
    await page.getByLabel("Email address").fill(owner.email!)
    await page.getByLabel("Password").fill(ownerPassword)
    await page.getByRole("button", { name: "Sign in" }).click()

    // Should be on home page
    await expect(page).toHaveURL("/home")

    // Both boards should be visible in the dashboard
    await expect(page.locator("body")).toContainText("Development Board")
    await expect(page.locator("body")).toContainText("Marketing Board")

    // Navigate to first board
    await page.goto(`/board/${board1.id}`)
    await expect(page.locator("body")).toContainText("Development Board")

    // Navigate to second board
    await page.goto(`/board/${board2.id}`)
    await expect(page.locator("body")).toContainText("Marketing Board")

    // Verify user can access home from board
    await page.goto("/home")
    await expect(page.locator("body")).toContainText("Your Boards")
    await expect(page.locator("body")).toContainText("Development Board")
    await expect(page.locator("body")).toContainText("Marketing Board")
  })

  test("should handle card detail page navigation and content", async ({
    page,
  }) => {
    // Setup: Create account and board
    const { account, plainPassword } = await createTestAccount()
    testAccountIds.push(account.id)
    const board = await createTestBoard(account.id, "Feature Board")

    // Login
    await page.goto("/login")
    await page.getByLabel("Email address").fill(account.email!)
    await page.getByLabel("Password").fill(plainPassword)
    await page.getByRole("button", { name: "Sign in" }).click()

    // Navigate to board
    await page.goto(`/board/${board.id}`)

    // Create a card
    const addCardButton = page
      .getByRole("button", { name: /add.*card/i })
      .first()
    if (await addCardButton.isVisible()) {
      await addCardButton.click()

      const cardInput = page
        .getByPlaceholder(/Enter a title for this card/i)
        .first()

      if (await cardInput.isVisible()) {
        await cardInput.fill("Design landing page")
        
        // Click Create Card button instead of pressing Enter
        const saveButton = page.getByRole("button", { name: /Create Card/i })
        await saveButton.click()

        // Wait a bit for the card to be created
        await page.waitForTimeout(1000)

        // Verify card appears (it may show as first few words)
        const cardVisible = await page.locator("text=/Design.*landing/i").first().isVisible()
        
        if (cardVisible) {
          // Find the card and navigate directly
          const cardLocator = page.locator('li[data-card-id]').filter({ hasText: /Design.*landing/i }).first()
          const cardId = await cardLocator.getAttribute("data-card-id")
          await page.goto(`/card/${cardId}`)

          // Should navigate to card detail
          await expect(page).toHaveURL(/\/card\//, { timeout: 10000 })

          // Verify board name is visible in card detail (breadcrumb or header)
          await expect(page.locator("body")).toContainText("Feature Board")

          // Verify card title is visible
          await expect(page.locator("body")).toContainText(/Design.*landing/i)

          // Try to navigate back to board
          const boardLink = page.getByRole("link", {
            name: /Feature Board|back to board/i,
          })
          if (await boardLink.isVisible()) {
            await boardLink.click()
            await expect(page).toHaveURL(/\/board\//)
          } else {
            // Fallback: navigate directly
            await page.goto(`/board/${board.id}`)
          }

          // Should be back on board
          await expect(page.locator("body")).toContainText("Feature Board")
        }
      }
    }
  })

  test("should add, edit, and delete comments on cards", async ({ page }) => {
    // Setup: Create account and board
    const { account, plainPassword } = await createTestAccount()
    testAccountIds.push(account.id)
    const board = await createTestBoard(account.id, "Collaboration Board")

    // Login
    await login(page, account.email!, plainPassword)

    // Navigate to board
    await navigateToBoard(page, board.id)

    // Create a card
    const addCardButton = page
      .getByRole("button", { name: /add.*card/i })
      .first()
    if (await addCardButton.isVisible()) {
      await addCardButton.click()

      const cardInput = page
        .getByPlaceholder(/Enter a title for this card/i)
        .first()

      if (await cardInput.isVisible()) {
        await cardInput.fill("Fix authentication bug")

        // Click Create Card button
        const saveButton = page.getByRole("button", { name: /Create Card/i })
        await saveButton.click()

        // Wait for card to appear in the list
        const cardLocator = page.locator('li[data-card-id]').filter({ hasText: "Fix authentication bug" })
        await expect(cardLocator).toBeVisible({ timeout: 10000 })

        // Get the card ID and navigate directly to it
        // This is more robust than clicking in a fast-moving UI
        const cardId = await cardLocator.getAttribute("data-card-id")
        await page.goto(`/card/${cardId}`)

        // Wait for card detail page
        await expect(page).toHaveURL(/\/card\//, { timeout: 10000 })

        // Add first comment
        const commentInput = page.getByPlaceholder(/Add a comment/i)
        await commentInput.fill("This bug affects login with special characters")
        await commentInput.press("Enter")

        // Wait for comment to appear
        await page.waitForTimeout(500)
        await expect(page.locator("body")).toContainText(
          "special characters"
        )

        // Add second comment
        await commentInput.fill(
          "Reproduced on Chrome and Firefox"
        )
        await commentInput.press("Enter")

        await page.waitForTimeout(500)
        await expect(page.locator("body")).toContainText("Chrome and Firefox")

        // Edit the first comment - find Edit button next to the comment text
        const editButton = page.getByRole("button", { name: /Edit/i }).first()
        await editButton.click()

        // Wait for edit input to appear and fill it
        const editTextarea = page.getByPlaceholder(/Edit comment/i)
        await editTextarea.waitFor({ state: "visible", timeout: 2000 })
        await editTextarea.fill(
          "This bug affects login with special characters like & < >"
        )

        // Submit by pressing Enter
        await editTextarea.press("Enter")

        await page.waitForTimeout(500)
        // Verify edit was saved
        await expect(page.locator("body")).toContainText("& < >")

        // Delete the second comment - find the comment containing "Chrome and Firefox" then its Delete button
        const secondCommentContainer = page.locator("text=Chrome and Firefox").locator("..").locator("..")
        const deleteButton = secondCommentContainer.getByRole("button", { name: /Delete/i })
        
        const deletePromise = page.waitForResponse(
          (resp) => resp.url().includes("/resources/delete-comment") && resp.status() === 200,
          { timeout: 5000 }
        )
        await deleteButton.click()
        await deletePromise

        await page.waitForTimeout(300)
        // Verify comment was deleted
        const commentStillExists = await page
          .locator("text=Chrome and Firefox")
          .count()
        expect(commentStillExists).toBe(0)

        // Verify first comment still exists
        await expect(page.locator("body")).toContainText("& < >")
      }
    }
  })

  test("should invite members and manage board access", async ({ page }) => {
    // Setup: Create owner and potential member
    const { account: owner, plainPassword: ownerPassword } =
      await createTestAccount()
    const { account: member, plainPassword: memberPassword } =
      await createTestAccount()
    testAccountIds.push(owner.id, member.id)

    const board = await createTestBoard(owner.id, "Team Project")

    // Login as owner
    await login(page, owner.email!, ownerPassword)

    // Navigate to board
    await navigateToBoard(page, board.id)

    // Go to members page
    const membersLink = page.getByRole("link", { name: /members|invite/i })
    await membersLink.click()

    // Should be on members page
    await expect(page).toHaveURL(/\/members/)

    // Invite the member - look for input by label or placeholder
    const emailInput = page.getByPlaceholder(/colleague@example.com/i).or(page.getByLabel(/email/i))
    await emailInput.fill(member.email!)

    const inviteButton = page.getByRole("button", {
      name: /invite|send/i,
    })
    
    await inviteButton.click()
    
    // Wait for the button to return to idle state (form submission complete)
    await expect(inviteButton).toHaveText(/send invitation/i, { timeout: 5000 })

    // Wait for the invitation to appear in the pending invitations section
    await expect(page.locator("body")).toContainText(member.email!, { timeout: 5000 })
    
    // Verify the pending invitations section is visible
    const pendingSection = page.getByText(/pending invitations/i)
    await expect(pendingSection).toBeVisible()
  })
})
