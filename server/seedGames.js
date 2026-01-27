const mongoose = require('mongoose');
const Game = require('./models/Game');
require('dotenv').config();

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

async function seedGames() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/challenger';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    // Check existing games
    const existingGames = await Game.find({});
    console.log(`Found ${existingGames.length} existing games`);

    if (existingGames.length > 0) {
      console.log('Games already exist:');
      existingGames.forEach(game => console.log(`  - ${game.name}`));
      await mongoose.connection.close();
      return;
    }

    // Insert games
    console.log('Seeding games...');
    const created = await Game.insertMany(testGames);
    console.log(`✓ Created ${created.length} games:`);
    created.forEach(game => console.log(`  - ${game.name}`));

    await mongoose.connection.close();
    console.log('✓ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding games:', error);
    process.exit(1);
  }
}

seedGames();
