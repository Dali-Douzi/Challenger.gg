import { expect } from '@playwright/test';

/**
 * Create a new team
 */
export async function createTeam(page, { teamName, game = 'Valorant', rank = 'Gold', server = 'NA' }) {
  await page.goto('/teams');

  // Click create team button (multiple possible button texts)
  await page.click('button:has-text("Create New Team"), button:has-text("Create Your First Team"), button:has-text("Create Team")');

  // Wait for dialog to appear
  await page.waitForTimeout(1000);

  // Fill team name - use getByLabel or getByPlaceholder for Material-UI TextFields
  await page.getByLabel(/Team Name/i).fill(teamName);

  // Click on Game dropdown - click the combobox div, not the label
  await page.locator('[role="combobox"]').nth(0).click();
  await page.waitForTimeout(300);
  await page.locator(`li:has-text("${game}")`).first().click();

  // Click on Rank dropdown
  await page.locator('[role="combobox"]').nth(1).click();
  await page.waitForTimeout(300);
  await page.locator(`li:has-text("${rank}")`).first().click();

  // Click on Server dropdown
  await page.locator('[role="combobox"]').nth(2).click();
  await page.waitForTimeout(300);
  await page.locator(`li:has-text("${server}")`).first().click();

  // Submit form
  await page.getByRole('button', { name: /Create Team/i }).click();

  // Wait for success or redirect
  await page.waitForTimeout(2000);

  return { teamName, game, rank, server };
}

/**
 * Get team code from team page
 */
export async function getTeamCode(page) {
  // Look for team code on the page
  const teamCodeLocator = page.locator('[data-testid="team-code"], .team-code, text=/Team Code:/i').first();
  await teamCodeLocator.waitFor({ timeout: 5000 });

  const teamCodeText = await teamCodeLocator.textContent();
  const match = teamCodeText.match(/[A-Z0-9]{6,}/);

  return match ? match[0] : null;
}

/**
 * Invite user to team using team code
 */
export async function inviteToTeam(page, teamCode) {
  await page.goto('/teams');

  // Click join team button
  await page.click('button:has-text("Join Team"), a:has-text("Join Team")');

  // Enter team code
  await page.fill('input[name="teamCode"], input[name="code"]', teamCode);

  // Submit
  await page.click('button[type="submit"]:has-text("Join")');

  // Wait for success
  await page.waitForTimeout(2000);
}

/**
 * Generate a unique team name
 */
export function generateTeamName(prefix = 'TestTeam') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}_${timestamp}_${random}`;
}
