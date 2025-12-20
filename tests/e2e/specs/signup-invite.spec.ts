import { test, expect } from "@playwright/test"
import {
  generateTestUser,
  createTestAccount,
  createTestBoard,
  createTestInvitation,
  cleanupTestData,
} from "../helpers/e2e-utils"

test.describe("Signup and Invitation Workflows", () => {
  const testAccountIds: string[] = []

  test.afterAll(async () => {
    // Cleanup all test data
    await cleanupTestData(testAccountIds)
  })

  test("should signup with a new account", async ({ page }) => {
    const user = generateTestUser()

    // Navigate to signup page
    await page.goto("/signup")

    // Fill in signup form
    await page.getByLabel("First Name").fill(user.firstName)
    await page.getByLabel("Last Name").fill(user.lastName)
    await page.getByLabel("Email address").fill(user.email)
    await page.getByLabel("Password").fill(user.password)

    // Submit form
    await page.getByRole("button", { name: "Sign up" }).click()

    // Should redirect to home page after successful signup
    await expect(page).toHaveURL("/home")

    // Should see welcome message or board list
    await expect(page.locator("body")).toContainText(/Boards|Welcome/)
  })

  test("should show validation errors for invalid signup data", async ({
    page,
  }) => {
    await page.goto("/signup")

    // Try to submit with short password
    await page.getByLabel("First Name").fill("Test")
    await page.getByLabel("Last Name").fill("User")
    await page.getByLabel("Email address").fill("test@example.com")
    await page.getByLabel("Password").fill("short") // Too short, no special char

    await page.getByRole("button", { name: "Sign up" }).click()

    // Should show validation error
    await expect(page.locator("body")).toContainText(
      /Password must be at least 8 characters|Password must contain a special character/
    )
  })

  test("should show error for duplicate email", async ({ page }) => {
    // Create existing account
    const { account, plainPassword } = await createTestAccount()
    testAccountIds.push(account.id)

    await page.goto("/signup")

    // Try to signup with same email
    await page.getByLabel("First Name").fill("Another")
    await page.getByLabel("Last Name").fill("User")
    await page.getByLabel("Email address").fill(account.email!)
    await page.getByLabel("Password").fill(plainPassword)

    await page.getByRole("button", { name: "Sign up" }).click()

    // Should show error about existing account
    await expect(page.locator("body")).toContainText(
      /account with this email address already exists/i
    )
  })

  test("should accept board invitation after signup", async ({ page }) => {
    // Setup: Create board owner and board
    const { account: owner } = await createTestAccount()
    testAccountIds.push(owner.id)

    const board = await createTestBoard(owner.id, "Test Project Board")

    // Create invitation for new user
    const newUser = generateTestUser()
    const invitation = await createTestInvitation(
      board.id,
      newUser.email,
      owner.id
    )

    // Navigate to signup with invitation ID
    await page.goto(`/signup?invitationId=${invitation.id}`)

    // Should see invitation context with board name
    await expect(page.locator("body")).toContainText(/Test Project Board/i)

    // Fill signup form
    await page.getByLabel("First Name").fill(newUser.firstName)
    await page.getByLabel("Last Name").fill(newUser.lastName)
    await page.getByLabel("Email address").fill(newUser.email)
    await page.getByLabel("Password").fill(newUser.password)

    await page.getByRole("button", { name: "Sign up" }).click()

    // Should redirect to invite page with explicit accept button
    await expect(page).toHaveURL(/\/invite/)
    await expect(page.locator("body")).toContainText(/You're Invited/i)
    await expect(page.locator("body")).toContainText(/Test Project Board/i)

    // Click explicit Accept button
    await page.getByRole("button", { name: /Accept Invitation/i }).click()

    // Should redirect to the board directly
    await expect(page).toHaveURL(/\/board\//)
    await expect(page.locator("body")).toContainText(/Test Project Board/i)
  })

  test("should login with existing account and accept invitation", async ({
    page,
  }) => {
    // Setup: Create board owner and board
    const { account: owner } = await createTestAccount()
    testAccountIds.push(owner.id)

    const board = await createTestBoard(owner.id, "Collaboration Board")

    // Create existing user
    const { account: existingUser, plainPassword } = await createTestAccount()
    testAccountIds.push(existingUser.id)

    // Create invitation for existing user
    const invitation = await createTestInvitation(
      board.id,
      existingUser.email!,
      owner.id
    )

    // Navigate to login with invitation ID
    await page.goto(`/login?invitationId=${invitation.id}`)

    // Should see invitation context with board name
    await expect(page.locator("body")).toContainText(/Collaboration Board/i)

    // Fill login form
    await page.getByLabel("Email address").fill(existingUser.email!)
    await page.getByLabel("Password").fill(plainPassword)

    await page.getByRole("button", { name: "Sign in" }).click()

    // Should redirect to invite page with explicit accept button
    await expect(page).toHaveURL(/\/invite/)
    await expect(page.locator("body")).toContainText(/You're Invited/i)
    await expect(page.locator("body")).toContainText(/Collaboration Board/i)

    // Click explicit Accept button
    await page.getByRole("button", { name: /Accept Invitation/i }).click()

    // Should redirect to the board directly
    await expect(page).toHaveURL(/\/board\//)
    await expect(page.locator("body")).toContainText(/Collaboration Board/i)
  })

  test("should validate login credentials", async ({ page }) => {
    await page.goto("/login")

    // Try invalid email format
    await page.getByLabel("Email address").fill("notanemail")
    await page.getByLabel("Password").fill("password")
    await page.getByRole("button", { name: "Sign in" }).click()

    // Should show validation error
    await expect(page.locator("body")).toContainText(
      /Please enter a valid email address/i
    )

    // Try with valid format but non-existent account
    await page.getByLabel("Email address").fill("nonexistent@example.com")
    await page.getByLabel("Password").fill("password123!")
    await page.getByRole("button", { name: "Sign in" }).click()

    // Should show invalid credentials error
    await expect(page.locator("body")).toContainText(/Invalid credentials/i)
  })

  test("should handle multiple pending invitations", async ({
    page,
  }) => {
    // Setup: Create board owner and multiple boards
    const { account: owner } = await createTestAccount()
    testAccountIds.push(owner.id)

    const board1 = await createTestBoard(owner.id, "Board One")
    const board2 = await createTestBoard(owner.id, "Board Two")

    // Create multiple invitations for the same email
    const newUser = generateTestUser()
    const invite1 = await createTestInvitation(board1.id, newUser.email, owner.id)
    const invite2 = await createTestInvitation(board2.id, newUser.email, owner.id)

    // Signup (no invitation ID in URL - regular signup)
    await page.goto("/signup")

    await page.getByLabel("First Name").fill(newUser.firstName)
    await page.getByLabel("Last Name").fill(newUser.lastName)
    await page.getByLabel("Email address").fill(newUser.email)
    await page.getByLabel("Password").fill(newUser.password)

    await page.getByRole("button", { name: "Sign up" }).click()

    // Should redirect to home (no auto-acceptance)
    await expect(page).toHaveURL("/home")

    // User needs to accept invitations one by one
    // Accept first invitation
    await page.goto(`/invite?id=${invite1.id}`)
    await page.getByRole("button", { name: /Accept Invitation/i }).click()
    await expect(page).toHaveURL(/\/board\//)
    await expect(page.locator("body")).toContainText(/Board One/i)

    // Accept second invitation
    await page.goto(`/invite?id=${invite2.id}`)
    await page.getByRole("button", { name: /Accept Invitation/i }).click()
    await expect(page).toHaveURL(/\/board\//)
    await expect(page.locator("body")).toContainText(/Board Two/i)

    // Both boards should now be accessible from home
    await page.goto("/home")
    await expect(page.locator("body")).toContainText(/Board One/i)
    await expect(page.locator("body")).toContainText(/Board Two/i)
  })
})
