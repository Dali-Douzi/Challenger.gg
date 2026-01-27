import { expect } from '@playwright/test';

/**
 * Register a new user
 */
export async function registerUser(page, { username, email, password }) {
  await page.goto('/signup');
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="confirmPassword"]', password);

  // Click the "Create account" button (Material-UI Button, not a form submit)
  await page.click('button:has-text("Create account")');

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  return { username, email, password };
}

/**
 * Login an existing user
 */
export async function loginUser(page, { email, password }) {
  await page.goto('/login');
  await page.waitForTimeout(1000);

  // Fill email and password using nth() since there are only 2 inputs
  const inputs = page.locator('input[type="text"], input[type="email"], input:not([type="password"])').first();
  await inputs.fill(email);

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(password);

  // Click the "Sign in" button
  await page.getByRole('button', { name: /Sign in/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

/**
 * Logout the current user
 */
export async function logoutUser(page) {
  // Click on the user menu/avatar
  await page.click('[data-testid="user-menu"], .user-menu, button:has-text("Logout"), a:has-text("Logout")');

  // Wait for logout to complete
  await page.waitForURL('**/login', { timeout: 5000 });
}

/**
 * Generate a unique test user
 */
export function generateTestUser(prefix = 'testuser') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return {
    username: `${prefix}_${timestamp}_${random}`,
    email: `${prefix}_${timestamp}_${random}@test.com`,
    password: 'TestPassword123!',
  };
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page) {
  try {
    // Check for user menu or dashboard elements
    await page.waitForSelector('[data-testid="user-menu"], .user-menu', { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
