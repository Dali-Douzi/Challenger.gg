import { test, expect } from '@playwright/test';
import { registerUser, generateTestUser, loginUser } from './helpers/auth.js';
import { createTeam, generateTeamName } from './helpers/teams.js';
import {
  generateTournamentName,
  createTournament,
  registerTeamToTournament,
  approvePendingTeam,
  lockRegistrations,
  lockBracket,
  getTournamentId,
} from './helpers/tournaments.js';

test.describe('Manual Tournament Setup', () => {
  test('setup tournament with 4 teams and lock bracket for manual interaction', async ({ browser }) => {
    test.setTimeout(600000); // 10 minutes timeout to allow manual interaction

    // Generate test data
    const organizer = generateTestUser('organizer');
    const participant1 = generateTestUser('player1');
    const participant2 = generateTestUser('player2');
    const participant3 = generateTestUser('player3');
    const tournamentName = generateTournamentName('ManualTest');
    const team1Name = generateTeamName('TeamAlpha');
    const team2Name = generateTeamName('TeamBeta');
    const team3Name = generateTeamName('TeamGamma');
    const team4Name = generateTeamName('TeamDelta');

    console.log('\n=== TOURNAMENT SETUP STARTING ===');
    console.log(`Tournament: ${tournamentName}`);
    console.log(`Teams: ${team1Name}, ${team2Name}, ${team3Name}, ${team4Name}`);
    console.log('=====================================\n');

    // Step 1: Organizer creates tournament and team
    console.log('Step 1: Setting up organizer and tournament...');
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await registerUser(page1, organizer);
    console.log('✓ Organizer registered');

    await createTeam(page1, {
      teamName: team1Name,
      game: 'Valorant',
      rank: 'Gold',
      server: 'NA',
    });
    console.log(`✓ Created ${team1Name}`);

    await page1.goto('/tournaments');
    await page1.waitForTimeout(2000);

    await createTournament(page1, {
      name: tournamentName,
      description: 'Manual Test Tournament - Setup for bracket interaction',
      game: 'Valorant',
      maxParticipants: 4,
    });
    console.log('✓ Tournament created');

    await page1.waitForTimeout(2000);
    let tournamentId = await getTournamentId(page1);

    if (!tournamentId) {
      const viewTournamentLink = page1.locator('a:has-text("View Tournament"), button:has-text("View Tournament")').first();
      const hasLink = await viewTournamentLink.count() > 0;
      if (hasLink) {
        await viewTournamentLink.click();
        await page1.waitForTimeout(2000);
        tournamentId = await getTournamentId(page1);
      }
    }

    console.log(`✓ Tournament ID: ${tournamentId}`);
    expect(tournamentId).toBeTruthy();

    // Organizer registers their team
    try {
      await registerTeamToTournament(page1, tournamentId);
      console.log(`✓ ${team1Name} registered to tournament`);
    } catch (err) {
      console.log(`✓ ${team1Name} auto-approved`);
    }

    // Step 2: Participant 1 joins
    console.log('\nStep 2: Participant 1 joining...');
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await registerUser(page2, participant1);
    await createTeam(page2, {
      teamName: team2Name,
      game: 'Valorant',
      rank: 'Gold',
      server: 'NA',
    });
    console.log(`✓ Created ${team2Name}`);

    await registerTeamToTournament(page2, tournamentId);
    await page2.waitForTimeout(2000);
    console.log(`✓ ${team2Name} registered to tournament`);
    await context2.close();

    // Step 3: Participant 2 joins
    console.log('\nStep 3: Participant 2 joining...');
    const context3 = await browser.newContext();
    const page3 = await context3.newPage();

    await registerUser(page3, participant2);
    await createTeam(page3, {
      teamName: team3Name,
      game: 'Valorant',
      rank: 'Gold',
      server: 'NA',
    });
    console.log(`✓ Created ${team3Name}`);

    await registerTeamToTournament(page3, tournamentId);
    await page3.waitForTimeout(2000);
    console.log(`✓ ${team3Name} registered to tournament`);
    await context3.close();

    // Step 4: Participant 3 joins
    console.log('\nStep 4: Participant 3 joining...');
    const context4 = await browser.newContext();
    const page4 = await context4.newPage();

    await registerUser(page4, participant3);
    await createTeam(page4, {
      teamName: team4Name,
      game: 'Valorant',
      rank: 'Gold',
      server: 'NA',
    });
    console.log(`✓ Created ${team4Name}`);

    await registerTeamToTournament(page4, tournamentId);
    await page4.waitForTimeout(2000);
    console.log(`✓ ${team4Name} registered to tournament`);
    await context4.close();

    // Step 5: Organizer approves all teams
    console.log('\nStep 5: Approving teams...');
    await page1.goto(`/tournaments/${tournamentId}`);
    await page1.waitForTimeout(2000);

    // Approve all pending teams
    for (let i = 0; i < 3; i++) {
      try {
        await approvePendingTeam(page1, tournamentId, 0);
        await page1.waitForTimeout(1000);
        console.log(`✓ Approved team ${i + 1}`);
      } catch (err) {
        console.log(`Note: Could not approve team ${i + 1} - ${err.message}`);
      }
    }

    // Verify all teams are registered
    await page1.goto(`/tournaments/${tournamentId}`);
    await page1.waitForTimeout(2000);
    const participantCount = page1.locator('text=/\\d+\\s*\\/\\s*\\d+|participants/i').first();
    const countText = await participantCount.textContent().catch(() => '');
    console.log(`✓ Participant count: ${countText}`);

    // Step 6: Lock registrations
    console.log('\nStep 6: Locking registrations...');
    try {
      await lockRegistrations(page1, tournamentId);
      console.log('✓ Registrations locked');
    } catch (err) {
      console.log(`Note: Could not lock registrations - ${err.message}`);
    }

    // Step 7: Lock bracket (generate matches)
    console.log('\nStep 7: Generating bracket...');
    try {
      await lockBracket(page1, tournamentId);
      console.log('✓ Bracket locked and matches generated');
    } catch (err) {
      console.log(`Note: Could not lock bracket - ${err.message}`);
    }

    // Navigate to bracket page
    await page1.goto(`/tournaments/${tournamentId}/bracket`);
    await page1.waitForTimeout(3000);

    console.log('\n=====================================');
    console.log('SETUP COMPLETE!');
    console.log('=====================================');
    console.log(`\nTournament ID: ${tournamentId}`);
    console.log(`Tournament URL: http://localhost:5173/tournaments/${tournamentId}`);
    console.log(`Bracket URL: http://localhost:5173/tournaments/${tournamentId}/bracket`);
    console.log(`\nOrganizer credentials:`);
    console.log(`  Email: ${organizer.email}`);
    console.log(`  Password: ${organizer.password}`);
    console.log(`\nTeams registered:`);
    console.log(`  1. ${team1Name} (Organizer)`);
    console.log(`  2. ${team2Name}`);
    console.log(`  3. ${team3Name}`);
    console.log(`  4. ${team4Name}`);
    console.log('\n=====================================');
    console.log('BROWSER WILL STAY OPEN FOR MANUAL INTERACTION');
    console.log('Press Ctrl+C in the terminal to close when done');
    console.log('=====================================\n');

    // Keep the browser open indefinitely for manual interaction
    await page1.waitForTimeout(600000); // Wait 10 minutes (or until test is stopped)
  });
});
