import { test, expect } from '@playwright/test';
import { registerUser, generateTestUser } from './helpers/auth.js';
import { createTeam, generateTeamName } from './helpers/teams.js';

test.describe('Team Management', () => {
  test('should create and display a new team', async ({ page }) => {
    // Create and login a test user
    const testUser = generateTestUser('teamtest');
    await registerUser(page, testUser);

    const teamName = generateTeamName('TestTeam');

    await createTeam(page, {
      teamName,
      game: 'Valorant',
      rank: 'Gold',
      server: 'NA',
    });

    // Verify team was created - check for success message or team appears in list
    const teamElement = page.locator(`text="${teamName}"`).first();
    await expect(teamElement).toBeVisible({ timeout: 5000 });
  });
});
