import { test, expect } from '@playwright/test';
import { registerUser, loginUser, generateTestUser } from './helpers/auth.js';

test.describe('Login', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    // Create a test user first
    const testUser = generateTestUser('logintest');
    await registerUser(page, testUser);

    // Logout by clearing cookies and navigating to login page
    await page.context().clearCookies();
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // Now login with that user
    await loginUser(page, {
      email: testUser.email,
      password: testUser.password,
    });

    // Verify we're on the dashboard
    await expect(page).toHaveURL(/.*dashboard/);

    // Verify user is logged in by checking for the avatar/user icon in top right
    const userAvatar = page.locator('header button, nav button, [role="button"]').last();
    await expect(userAvatar).toBeVisible();
  });
});
