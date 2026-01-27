import { test, expect } from '@playwright/test';
import { registerUser, generateTestUser } from './helpers/auth.js';

test.describe('Registration', () => {
  test('should register a new user successfully', async ({ page }) => {
    const newUser = generateTestUser('regtest');

    await registerUser(page, newUser);

    // Verify we're on the dashboard
    await expect(page).toHaveURL(/.*dashboard/);

    // Verify user is logged in by checking for the avatar/user icon in top right
    const userAvatar = page.locator('header button, nav button, [role="button"]').last();
    await expect(userAvatar).toBeVisible();
  });
});
