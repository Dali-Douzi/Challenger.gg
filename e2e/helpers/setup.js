import api from '../../client/src/services/apiClient.js';

/**
 * Seed the database with test games
 */
export async function seedTestGames() {
  try {
    // Check if games already exist
    const existingGames = await api.get('/api/games');
    const gamesData = existingGames.data || existingGames || [];
    const games = Array.isArray(gamesData) ? gamesData : [];

    if (games.length > 0) {
      console.log(`✓ Games already seeded (${games.length} games found)`);
      return games;
    }

    // Create test games directly in MongoDB
    console.log('Seeding test games...');

    const testGames = [
      {
        name: 'Valorant',
        servers: ['NA', 'EU', 'APAC', 'BR', 'KR'],
        ranks: ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'],
        formats: ['5v5', '1v1', 'Team Deathmatch']
      },
      {
        name: 'League of Legends',
        servers: ['NA', 'EUW', 'EUNE', 'KR', 'BR', 'LAN', 'LAS', 'OCE', 'RU', 'TR', 'JP'],
        ranks: ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Challenger'],
        formats: ['5v5', 'ARAM', '3v3']
      },
      {
        name: 'CS2',
        servers: ['NA', 'EU', 'Asia', 'SA', 'OCE'],
        ranks: ['Silver', 'Gold Nova', 'Master Guardian', 'Distinguished Master Guardian', 'Legendary Eagle', 'Supreme', 'Global Elite'],
        formats: ['5v5', '2v2', '1v1']
      }
    ];

    // Note: We can't create games via API since there's no POST endpoint
    // This will need to be done via direct MongoDB connection or admin panel
    console.warn('⚠ Games need to be created via MongoDB or admin panel');
    console.log('Games to create:', JSON.stringify(testGames, null, 2));

    return [];
  } catch (error) {
    console.error('Error seeding games:', error.message);
    return [];
  }
}

/**
 * Clean up test data
 */
export async function cleanupTestData() {
  // Add cleanup logic here if needed
  console.log('Cleanup completed');
}
