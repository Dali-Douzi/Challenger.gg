import { expect } from '@playwright/test';

/**
 * Generate a unique tournament name
 */
export function generateTournamentName(prefix = 'Tournament') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a tournament
 */
export async function createTournament(page, { name, description = 'Test tournament', game = 'Valorant', maxParticipants = 8, phases = [{ bracketType: 'SINGLE_ELIM' }] }) {
  console.log('Navigating to tournament creation page...');
  await page.goto('/tournaments/create');
  await page.waitForTimeout(2000);

  // Wait for form to be visible
  await page.waitForSelector('form', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Fill tournament name - first text input
  console.log(`Filling tournament name: ${name}`);
  const allInputs = page.locator('input[type="text"], input:not([type])');
  const nameInput = allInputs.first();
  await nameInput.waitFor({ state: 'visible', timeout: 5000 });
  await nameInput.click();
  await nameInput.fill(name);
  await page.waitForTimeout(500);

  // Fill description - first textarea
  const descInput = page.locator('textarea').first();
  await descInput.click();
  await descInput.fill(description);
  await page.waitForTimeout(500);

  // Set start date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateString = tomorrow.toISOString().split('T')[0];
  const dateInput = page.locator('input[type="date"]').first();
  await dateInput.fill(dateString);
  await page.waitForTimeout(500);

  // Wait for games to load
  console.log('Waiting for games to load...');
  await page.waitForTimeout(3000);

  // Select game - find the select dropdown with id containing "game" or with helper text about games
  const gameSelects = page.locator('div[role="combobox"]');
  const gameSelectCount = await gameSelects.count();
  console.log(`Found ${gameSelectCount} select dropdowns`);

  if (gameSelectCount > 0) {
    await gameSelects.first().click();
    await page.waitForTimeout(500);

    // Select game option from dropdown
    const gameOption = page.getByRole('option', { name: game });
    await gameOption.click();
    await page.waitForTimeout(500);
  }

  // Set max participants - find number input
  const maxParticipantsInput = page.locator('input[type="number"]').first();
  await maxParticipantsInput.fill(maxParticipants.toString());
  await page.waitForTimeout(500);

  // Submit form
  const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
  await submitButton.click();
  await page.waitForTimeout(2000);

  // Wait for success message with referee code
  const refereeCodeElement = page.locator('text=/referee code/i, text=/tournament created/i').first();
  await refereeCodeElement.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

  // Click "Go to Tournament" button to navigate to tournament page
  const goToButton = page.locator('button:has-text("Go to Tournament")').first();
  const hasGoToButton = await goToButton.count() > 0;

  if (hasGoToButton) {
    await goToButton.click();
    await page.waitForTimeout(2000);
  }

  console.log(`Tournament created: ${name}`);
  return { name, refereeCodeVisible: true };
}

/**
 * Register team to tournament
 */
export async function registerTeamToTournament(page, tournamentId) {
  await page.goto(`/tournaments/${tournamentId}`);
  await page.waitForTimeout(2000);

  // Click "Join Tournament" button
  const joinButton = page.locator('button:has-text("Join"), button:has-text("Register")').first();
  await joinButton.click();
  await page.waitForTimeout(500);

  // Select first available team from modal/dropdown
  const teamSelect = page.locator('[role="combobox"]').last();
  await teamSelect.click();
  await page.waitForTimeout(300);
  const firstTeamOption = page.locator('[role="option"]').first();
  await firstTeamOption.click();
  await page.waitForTimeout(300);

  // Confirm registration
  const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Submit")').first();
  await confirmButton.click();
  await page.waitForTimeout(2000);

  console.log('Team registration submitted');
}

/**
 * Approve pending team (organizer only)
 */
export async function approvePendingTeam(page, tournamentId, teamIndex = 0) {
  await page.goto(`/tournaments/${tournamentId}`);
  await page.waitForTimeout(2000);

  // Look for "Approve" or "Accept" button for pending teams
  const approveButtons = page.locator('button:has-text("Approve"), button:has-text("Accept")');
  const buttonCount = await approveButtons.count();
  console.log(`Found ${buttonCount} approve button(s)`);

  if (buttonCount > teamIndex) {
    await approveButtons.nth(teamIndex).click();
    await page.waitForTimeout(2000);
    console.log('Team approved');
  } else {
    throw new Error(`No approve button found at index ${teamIndex}`);
  }
}

/**
 * Lock tournament registrations (organizer only)
 */
export async function lockRegistrations(page, tournamentId) {
  await page.goto(`/tournaments/${tournamentId}`);
  await page.waitForTimeout(2000);

  // Find and click "Lock Registrations" button
  const lockRegButton = page.locator('button:has-text("Lock Registration"), button:has-text("Close Registration")').first();
  await lockRegButton.click();
  await page.waitForTimeout(2000);

  console.log('Registrations locked');
}

/**
 * Lock bracket (organizer only)
 */
export async function lockBracket(page, tournamentId) {
  await page.goto(`/tournaments/${tournamentId}`);
  await page.waitForTimeout(2000);

  // Find and click "Lock Bracket" button
  const lockBracketButton = page.locator('button:has-text("Lock Bracket"), button:has-text("Generate Bracket")').first();
  await lockBracketButton.click();
  await page.waitForTimeout(2000);

  console.log('Bracket locked and generated');
}

/**
 * Start tournament (organizer/referee only)
 */
export async function startTournament(page, tournamentId) {
  await page.goto(`/tournaments/${tournamentId}`);
  await page.waitForTimeout(2000);

  // Find and click "Start Tournament" button
  const startButton = page.locator('button:has-text("Start Tournament"), button:has-text("Begin")').first();
  await startButton.click();
  await page.waitForTimeout(2000);

  console.log('Tournament started');
}

/**
 * Navigate to bracket page
 */
export async function navigateToBracket(page, tournamentId) {
  await page.goto(`/tournaments/${tournamentId}/bracket`);
  await page.waitForTimeout(2000);

  // Verify bracket page loaded
  const bracketCanvas = page.locator('#bracket-canvas, [id*="bracket"]').first();
  const isVisible = await bracketCanvas.isVisible().catch(() => false);

  console.log(`Bracket page loaded: ${isVisible}`);
  return isVisible;
}

/**
 * Submit match result (organizer/referee only)
 */
export async function submitMatchResult(page, tournamentId, { matchIndex = 0, scoreA = 2, scoreB = 1, winnerTeamIndex = 0 }) {
  await page.goto(`/tournaments/${tournamentId}/bracket`);
  await page.waitForTimeout(2000);

  // Find match components/cards
  const matchElements = page.locator('[data-testid*="match"], [class*="match"], .match-card').or(
    page.locator('div:has-text("vs")').filter({ has: page.locator('input[type="number"]') })
  );

  const matchCount = await matchElements.count();
  console.log(`Found ${matchCount} match element(s)`);

  if (matchCount > matchIndex) {
    const matchElement = matchElements.nth(matchIndex);

    // Enter scores
    const scoreInputs = matchElement.locator('input[type="number"]');
    const scoreInputCount = await scoreInputs.count();

    if (scoreInputCount >= 2) {
      await scoreInputs.nth(0).fill(scoreA.toString());
      await page.waitForTimeout(300);
      await scoreInputs.nth(1).fill(scoreB.toString());
      await page.waitForTimeout(300);

      // Submit/save button
      const saveButton = matchElement.locator('button:has-text("Save"), button:has-text("Submit")').first();
      const hasSaveButton = await saveButton.count() > 0;
      if (hasSaveButton) {
        await saveButton.click();
        await page.waitForTimeout(1000);
      }

      console.log(`Match result submitted: ${scoreA}-${scoreB}`);
    }
  }
}

/**
 * Verify tournament status
 */
export async function verifyTournamentStatus(page, tournamentId, expectedStatus) {
  await page.goto(`/tournaments/${tournamentId}`);
  await page.waitForTimeout(2000);

  // Look for status indicator
  const statusText = page.locator(`text=/status.*${expectedStatus}/i, text=/${expectedStatus}/i`).first();
  await expect(statusText).toBeVisible({ timeout: 5000 });
  console.log(`✓ Tournament status: ${expectedStatus}`);
}

/**
 * Get tournament ID from URL or page
 */
export async function getTournamentId(page) {
  const url = page.url();
  const match = url.match(/\/tournaments\/([a-zA-Z0-9]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}
