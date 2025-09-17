import { test, expect, Page } from '@playwright/test'

// Test data setup
const testProject = {
  id: 'test-project-123',
  name: 'Test Production Project',
  description: 'End-to-end test project for readiness system'
}

const testUser = {
  email: 'admin@test.com',
  password: 'testpassword123',
  role: 'admin'
}

// Helper functions
async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.fill('[data-testid="email-input"]', testUser.email)
  await page.fill('[data-testid="password-input"]', testUser.password)
  await page.click('[data-testid="login-button"]')
  await page.waitForURL('/projects')
}

async function createTestProject(page: Page) {
  await page.click('[data-testid="create-project-button"]')
  await page.fill('[data-testid="project-name-input"]', testProject.name)
  await page.fill('[data-testid="project-description-input"]', testProject.description)
  await page.click('[data-testid="create-project-submit"]')
  await page.waitForURL(`/projects/${testProject.id}`)
}

async function navigateToProject(page: Page) {
  await page.goto(`/projects/${testProject.id}`)
  await page.waitForLoadState('networkidle')
}

test.describe('Project Readiness System E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await loginAsAdmin(page)
  })

  test('complete readiness workflow from setup to finalization', async ({ page }) => {
    // Create a new project
    await createTestProject(page)

    // Verify initial getting-started status
    await expect(page.locator('[data-testid="project-status"]')).toContainText('Getting Started')
    await expect(page.locator('[data-testid="dashboard-section"]')).toBeVisible()

    // Check initial todo items
    await expect(page.locator('[data-testid="critical-todos"]')).toBeVisible()
    await expect(page.locator('[data-testid="todo-assign-team"]')).toContainText('Assign team members')
    await expect(page.locator('[data-testid="todo-add-talent"]')).toContainText('Add talent to roster')

    // Step 1: Add team members
    await page.click('[data-testid="todo-assign-team"] [data-testid="action-button"]')
    await page.waitForURL(`/projects/${testProject.id}/roles-team`)

    // Add supervisor
    await page.click('[data-testid="assign-staff-button"]')
    await page.selectOption('[data-testid="staff-select"]', 'supervisor-user-id')
    await page.selectOption('[data-testid="role-select"]', 'supervisor')
    await page.click('[data-testid="assign-staff-submit"]')

    // Add escorts
    await page.click('[data-testid="assign-staff-button"]')
    await page.selectOption('[data-testid="staff-select"]', 'escort-user-1-id')
    await page.selectOption('[data-testid="role-select"]', 'talent_escort')
    await page.click('[data-testid="assign-staff-submit"]')

    await page.click('[data-testid="assign-staff-button"]')
    await page.selectOption('[data-testid="staff-select"]', 'escort-user-2-id')
    await page.selectOption('[data-testid="role-select"]', 'talent_escort')
    await page.click('[data-testid="assign-staff-submit"]')

    // Verify team assignments
    await expect(page.locator('[data-testid="team-member-supervisor"]')).toBeVisible()
    await expect(page.locator('[data-testid="team-member-escort-1"]')).toBeVisible()
    await expect(page.locator('[data-testid="team-member-escort-2"]')).toBeVisible()

    // Step 2: Add talent
    await page.click('[data-testid="talent-roster-tab"]')
    await page.waitForURL(`/projects/${testProject.id}/talent-roster`)

    // Add talent members
    await page.click('[data-testid="add-talent-button"]')
    await page.fill('[data-testid="talent-name-input"]', 'John Doe')
    await page.fill('[data-testid="talent-email-input"]', 'john.doe@talent.com')
    await page.click('[data-testid="add-talent-submit"]')

    await page.click('[data-testid="add-talent-button"]')
    await page.fill('[data-testid="talent-name-input"]', 'Jane Smith')
    await page.fill('[data-testid="talent-email-input"]', 'jane.smith@talent.com')
    await page.click('[data-testid="add-talent-submit"]')

    // Verify talent roster
    await expect(page.locator('[data-testid="talent-john-doe"]')).toBeVisible()
    await expect(page.locator('[data-testid="talent-jane-smith"]')).toBeVisible()

    // Step 3: Check updated status
    await page.click('[data-testid="info-tab"]')
    await page.waitForURL(`/projects/${testProject.id}/info`)

    // Status should now be operational
    await expect(page.locator('[data-testid="project-status"]')).toContainText('Operational')
    await expect(page.locator('[data-testid="status-description"]')).toContainText('Ready for limited operations')

    // Critical todos should be resolved
    await expect(page.locator('[data-testid="todo-assign-team"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="todo-add-talent"]')).not.toBeVisible()

    // Should have important todos for configuration
    await expect(page.locator('[data-testid="important-todos"]')).toBeVisible()
    await expect(page.locator('[data-testid="todo-configure-roles"]')).toContainText('Configure custom roles')
    await expect(page.locator('[data-testid="todo-configure-locations"]')).toContainText('Add custom locations')

    // Step 4: Configure custom locations
    await page.click('[data-testid="todo-configure-locations"] [data-testid="action-button"]')

    // Add custom location
    await page.click('[data-testid="add-location-button"]')
    await page.fill('[data-testid="location-name-input"]', 'Wardrobe')
    await page.selectOption('[data-testid="location-color-select"]', 'purple')
    await page.click('[data-testid="add-location-submit"]')

    // Verify location added
    await expect(page.locator('[data-testid="location-wardrobe"]')).toBeVisible()

    // Step 5: Configure custom roles
    await page.click('[data-testid="roles-team-tab"]')
    await page.waitForURL(`/projects/${testProject.id}/roles-team`)

    // Add custom role
    await page.click('[data-testid="add-role-template-button"]')
    await page.fill('[data-testid="role-name-input"]', 'Hair & Makeup')
    await page.fill('[data-testid="role-display-name-input"]', 'Hair & Makeup Artist')
    await page.fill('[data-testid="role-pay-rate-input"]', '35')
    await page.selectOption('[data-testid="role-time-type-select"]', 'hourly')
    await page.click('[data-testid="add-role-submit"]')

    // Verify role template added
    await expect(page.locator('[data-testid="role-template-hair-makeup"]')).toBeVisible()

    // Step 6: Test mode toggle functionality
    await expect(page.locator('[data-testid="mode-toggle"]')).toBeVisible()
    await expect(page.locator('[data-testid="configuration-mode"]')).toHaveClass(/bg-primary/)

    // Switch to operations mode
    await page.click('[data-testid="operations-mode"]')
    await expect(page.locator('[data-testid="operations-mode"]')).toHaveClass(/bg-primary/)
    await expect(page.locator('[data-testid="operations-dashboard"]')).toBeVisible()

    // Switch back to configuration mode
    await page.click('[data-testid="configuration-mode"]')
    await expect(page.locator('[data-testid="configuration-mode"]')).toHaveClass(/bg-primary/)
    await expect(page.locator('[data-testid="project-tabs"]')).toBeVisible()

    // Step 7: Test feature availability
    await page.click('[data-testid="info-tab"]')

    // Check feature availability section
    await expect(page.locator('[data-testid="feature-availability"]')).toBeVisible()
    await expect(page.locator('[data-testid="time-tracking-available"]')).toContainText('Enabled')
    await expect(page.locator('[data-testid="assignments-available"]')).toContainText('Enabled')
    await expect(page.locator('[data-testid="location-tracking-available"]')).toContainText('Enabled')

    // Step 8: Create assignments
    await page.click('[data-testid="assignments-tab"]')
    await page.waitForURL(`/projects/${testProject.id}/assignments`)

    // Create assignment for tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    await page.click('[data-testid="create-assignment-button"]')
    await page.fill('[data-testid="assignment-date-input"]', tomorrowStr)
    await page.selectOption('[data-testid="talent-select"]', 'john-doe-id')
    await page.selectOption('[data-testid="escort-select"]', 'escort-user-1-id')
    await page.selectOption('[data-testid="location-select"]', 'house')
    await page.click('[data-testid="create-assignment-submit"]')

    // Verify assignment created
    await expect(page.locator('[data-testid="assignment-john-doe"]')).toBeVisible()

    // Step 9: Check assignment progress
    await page.click('[data-testid="info-tab"]')

    // Assignment progress should be updated
    await expect(page.locator('[data-testid="assignment-progress"]')).toBeVisible()
    await expect(page.locator('[data-testid="assignment-completion-rate"]')).toContainText('%')

    // Step 10: Finalize areas
    // Finalize locations
    await expect(page.locator('[data-testid="finalize-locations-button"]')).toBeVisible()
    await page.click('[data-testid="finalize-locations-button"]')
    
    // Handle confirmation dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('finalize locations')
      await dialog.accept()
    })

    // Wait for finalization to complete
    await expect(page.locator('[data-testid="locations-finalized-status"]')).toContainText('✅ Finalized')

    // Finalize roles
    await page.click('[data-testid="finalize-roles-button"]')
    await expect(page.locator('[data-testid="roles-finalized-status"]')).toContainText('✅ Finalized')

    // Finalize team
    await page.click('[data-testid="finalize-team-button"]')
    await expect(page.locator('[data-testid="team-finalized-status"]')).toContainText('✅ Finalized')

    // Finalize talent
    await page.click('[data-testid="finalize-talent-button"]')
    await expect(page.locator('[data-testid="talent-finalized-status"]')).toContainText('✅ Finalized')

    // Step 11: Verify production-ready status
    await expect(page.locator('[data-testid="project-status"]')).toContainText('Production Ready')
    await expect(page.locator('[data-testid="status-description"]')).toContainText('All systems configured and ready')

    // Check completed setup section
    await expect(page.locator('[data-testid="completed-setup"]')).toBeVisible()
    await expect(page.locator('[data-testid="completed-locations"]')).toContainText('✅ Locations finalized')
    await expect(page.locator('[data-testid="completed-roles"]')).toContainText('✅ Roles finalized')
    await expect(page.locator('[data-testid="completed-team"]')).toContainText('✅ Team finalized')
    await expect(page.locator('[data-testid="completed-talent"]')).toContainText('✅ Talent finalized')

    // Todo list should be minimal or empty
    const todoItems = await page.locator('[data-testid="todo-item"]').count()
    expect(todoItems).toBeLessThanOrEqual(2) // Only optional items should remain
  })

  test('real-time updates across multiple browser sessions', async ({ page, context }) => {
    // Create test project
    await createTestProject(page)

    // Open second browser session
    const page2 = await context.newPage()
    await loginAsAdmin(page2)
    await navigateToProject(page2)

    // Both pages should show getting-started status
    await expect(page.locator('[data-testid="project-status"]')).toContainText('Getting Started')
    await expect(page2.locator('[data-testid="project-status"]')).toContainText('Getting Started')

    // Add team member in first session
    await page.click('[data-testid="roles-team-tab"]')
    await page.click('[data-testid="assign-staff-button"]')
    await page.selectOption('[data-testid="staff-select"]', 'supervisor-user-id')
    await page.selectOption('[data-testid="role-select"]', 'supervisor')
    await page.click('[data-testid="assign-staff-submit"]')

    // Second session should update automatically
    await page2.waitForTimeout(2000) // Wait for real-time update
    await expect(page2.locator('[data-testid="team-member-supervisor"]')).toBeVisible()

    // Add talent in second session
    await page2.click('[data-testid="talent-roster-tab"]')
    await page2.click('[data-testid="add-talent-button"]')
    await page2.fill('[data-testid="talent-name-input"]', 'Real-time Test Talent')
    await page2.fill('[data-testid="talent-email-input"]', 'realtime@test.com')
    await page2.click('[data-testid="add-talent-submit"]')

    // First session should update automatically
    await page.click('[data-testid="talent-roster-tab"]')
    await page.waitForTimeout(2000) // Wait for real-time update
    await expect(page.locator('[data-testid="talent-realtime-test"]')).toBeVisible()

    // Both sessions should show updated dashboard
    await page.click('[data-testid="info-tab"]')
    await page2.click('[data-testid="info-tab"]')

    await page.waitForTimeout(2000) // Wait for real-time update
    await page2.waitForTimeout(2000)

    // Check that both sessions show consistent data
    const status1 = await page.locator('[data-testid="project-status"]').textContent()
    const status2 = await page2.locator('[data-testid="project-status"]').textContent()
    expect(status1).toBe(status2)
  })

  test('error handling and recovery', async ({ page }) => {
    await createTestProject(page)

    // Test finalization with network error
    await page.route('**/api/projects/*/readiness/finalize', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    // Attempt to finalize locations
    await page.click('[data-testid="finalize-locations-button"]')
    
    page.on('dialog', async dialog => {
      await dialog.accept()
    })

    // Should show error toast
    await expect(page.locator('[data-testid="error-toast"]')).toContainText('Finalization Failed')

    // Button should not be disabled after error
    await expect(page.locator('[data-testid="finalize-locations-button"]')).not.toBeDisabled()

    // Remove network error and try again
    await page.unroute('**/api/projects/*/readiness/finalize')

    await page.click('[data-testid="finalize-locations-button"]')
    await expect(page.locator('[data-testid="locations-finalized-status"]')).toContainText('✅ Finalized')
  })

  test('accessibility and keyboard navigation', async ({ page }) => {
    await createTestProject(page)

    // Test mode toggle keyboard navigation
    await page.keyboard.press('Tab') // Navigate to mode toggle
    await expect(page.locator('[data-testid="configuration-mode"]')).toBeFocused()

    await page.keyboard.press('ArrowRight') // Move to operations mode
    await expect(page.locator('[data-testid="operations-mode"]')).toBeFocused()

    await page.keyboard.press('Enter') // Activate operations mode
    await expect(page.locator('[data-testid="operations-mode"]')).toHaveClass(/bg-primary/)

    // Test finalization button keyboard navigation
    await page.keyboard.press('Tab') // Navigate to finalize button
    await expect(page.locator('[data-testid="finalize-locations-button"]')).toBeFocused()

    // Test ARIA attributes
    await expect(page.locator('[data-testid="mode-toggle"]')).toHaveAttribute('role', 'group')
    await expect(page.locator('[data-testid="configuration-mode"]')).toHaveAttribute('aria-pressed')
    await expect(page.locator('[data-testid="operations-mode"]')).toHaveAttribute('aria-pressed')

    // Test screen reader announcements
    await expect(page.locator('[data-testid="project-status"]')).toHaveAttribute('aria-live', 'polite')
    await expect(page.locator('[data-testid="todo-list"]')).toHaveAttribute('aria-label')
  })

  test('mobile responsive behavior', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await createTestProject(page)

    // Mode toggle should be responsive
    await expect(page.locator('[data-testid="mode-toggle"]')).toBeVisible()
    
    // Dashboard should stack vertically on mobile
    await expect(page.locator('[data-testid="dashboard-section"]')).toHaveCSS('flex-direction', 'column')

    // Todo items should be touch-friendly
    const todoButton = page.locator('[data-testid="todo-assign-team"] [data-testid="action-button"]')
    const buttonBox = await todoButton.boundingBox()
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44) // Minimum touch target

    // Test touch interactions
    await todoButton.tap()
    await page.waitForURL(`/projects/${testProject.id}/roles-team`)
  })

  test('performance and caching', async ({ page }) => {
    await createTestProject(page)

    // Measure initial load time
    const startTime = Date.now()
    await page.goto(`/projects/${testProject.id}`)
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime

    // Dashboard should load within 2 seconds
    expect(loadTime).toBeLessThan(2000)

    // Test caching behavior
    const responsePromise = page.waitForResponse('**/api/projects/*/readiness')
    await page.reload()
    const response = await responsePromise
    
    // Should use cached data on subsequent loads
    const responseData = await response.json()
    expect(responseData.cached).toBeDefined()

    // Test cache invalidation
    await page.click('[data-testid="refresh-button"]')
    const refreshResponse = await page.waitForResponse('**/api/projects/*/readiness?refresh=true')
    const refreshData = await refreshResponse.json()
    expect(refreshData.cached).toBe(false)
  })
})

test.describe('Project Readiness Edge Cases', () => {
  test('handles projects with no data gracefully', async ({ page }) => {
    await loginAsAdmin(page)
    
    // Navigate to empty project
    await page.goto('/projects/empty-project-id')
    
    // Should show appropriate empty states
    await expect(page.locator('[data-testid="empty-project-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="setup-guidance"]')).toContainText('Get started by adding team members')
  })

  test('handles partial data scenarios', async ({ page }) => {
    await loginAsAdmin(page)
    await createTestProject(page)

    // Add only talent, no staff
    await page.click('[data-testid="talent-roster-tab"]')
    await page.click('[data-testid="add-talent-button"]')
    await page.fill('[data-testid="talent-name-input"]', 'Lonely Talent')
    await page.click('[data-testid="add-talent-submit"]')

    await page.click('[data-testid="info-tab"]')

    // Should show critical todo for missing escorts
    await expect(page.locator('[data-testid="todo-assign-escorts"]')).toBeVisible()
    await expect(page.locator('[data-testid="todo-assign-escorts"]')).toContainText('Talent needs escort assignments')
  })

  test('handles finalization permissions correctly', async ({ page, context }) => {
    // Login as non-admin user
    const regularUserPage = await context.newPage()
    await regularUserPage.goto('/login')
    await regularUserPage.fill('[data-testid="email-input"]', 'user@test.com')
    await regularUserPage.fill('[data-testid="password-input"]', 'password')
    await regularUserPage.click('[data-testid="login-button"]')

    await regularUserPage.goto(`/projects/${testProject.id}`)

    // Finalization buttons should not be visible for regular users
    await expect(regularUserPage.locator('[data-testid="finalize-locations-button"]')).not.toBeVisible()
  })
})