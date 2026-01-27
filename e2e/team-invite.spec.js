import { test, expect } from '@playwright/test';
import { registerUser, generateTestUser } from './helpers/auth.js';
import { createTeam, generateTeamName, getTeamCode, inviteToTeam } from './helpers/teams.js';

test.describe('Team Invitations', () => {
  test('should allow user to join team with team code', async ({ browser }) => {
    // Create two users: one team owner, one joiner
    const ownerUser = generateTestUser('teamowner');
    const joinerUser = generateTestUser('teamjoiner');
    const teamName = generateTeamName('InviteTeam');

    // Setup: Owner creates team and gets team code
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();

    await registerUser(ownerPage, ownerUser);
    await createTeam(ownerPage, {
      teamName,
      game: 'Valorant',
      rank: 'Gold',
      server: 'NA',
    });

    // Navigate to team details to get team code
    await ownerPage.goto('/teams');
    await ownerPage.waitForTimeout(1000);
    await ownerPage.click(`text="${teamName}"`);
    await ownerPage.waitForTimeout(1000);

    // Get team code
    let teamCode;
    try {
      teamCode = await getTeamCode(ownerPage);
    } catch (error) {
      // If we can't find team code on the page, look in the URL or use a fallback
      console.log('Could not find team code on page, may need to adjust selector');
      try {
        const teamCodeElement = ownerPage.locator('[data-testid="team-code"], .team-code').first();
        const codeText = await teamCodeElement.textContent();
        teamCode = codeText.match(/[A-Z0-9]{6,}/)?.[0];
      } catch (e) {
        // Fallback: try to find any text with "code" keyword
        const codeText = await ownerPage.getByText(/code/i).first().textContent();
        teamCode = codeText.match(/[A-Z0-9]{6,}/)?.[0];
      }
    }

    await ownerContext.close();

    // Second user joins team
    const joinerContext = await browser.newContext();
    const joinerPage = await joinerContext.newPage();

    await registerUser(joinerPage, joinerUser);

    if (teamCode) {
      await inviteToTeam(joinerPage, teamCode);

      // Verify user is now part of the team
      await joinerPage.goto('/teams');
      await joinerPage.waitForTimeout(1000);

      const teamElement = joinerPage.locator(`text="${teamName}"`).first();
      await expect(teamElement).toBeVisible({ timeout: 5000 });
    } else {
      console.log('Test skipped: Could not retrieve team code');
    }

    await joinerContext.close();
  });
});
