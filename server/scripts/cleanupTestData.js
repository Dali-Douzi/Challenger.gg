const mongoose = require('mongoose');
const User = require('../models/User');
const Team = require('../models/Team');
const Scrim = require('../models/Scrim');
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function cleanupTestData() {
  try {
    console.log('🧹 Starting test data cleanup...');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all test users (containing 'test' in username or email)
    const testUsers = await User.find({
      $or: [
        { username: /test/i },
        { email: /test/i },
        { username: /logintest|regtest|teamtest|scrimuser|teamowner|teamjoiner/i }
      ]
    });

    console.log(`📊 Found ${testUsers.length} test users`);

    if (testUsers.length === 0) {
      console.log('✅ No test data to clean up');
      process.exit(0);
    }

    const testUserIds = testUsers.map(u => u._id);

    // Find and delete teams owned by test users
    const testTeams = await Team.find({
      $or: [
        { owner: { $in: testUserIds } },
        { 'members.user': { $in: testUserIds } },
        { name: /test/i }
      ]
    });
    const testTeamIds = testTeams.map(t => t._id);
    console.log(`📊 Found ${testTeams.length} test teams`);

    // Find and delete scrims created by test teams
    const testScrims = await Scrim.find({
      $or: [
        { teamA: { $in: testTeamIds } },
        { teamB: { $in: testTeamIds } }
      ]
    });
    const testScrimIds = testScrims.map(s => s._id);
    console.log(`📊 Found ${testScrims.length} test scrims`);

    // Find and delete chats involving test users/teams
    const testChats = await Chat.find({
      $or: [
        { participants: { $in: testUserIds } },
        { 'teamParticipants.team': { $in: testTeamIds } },
        { 'metadata.scrimId': { $in: testScrimIds } }
      ]
    });
    console.log(`📊 Found ${testChats.length} test chats`);

    // Find and delete notifications for test users/teams
    const testNotifications = await Notification.find({
      $or: [
        { user: { $in: testUserIds } },
        { team: { $in: testTeamIds } },
        { scrim: { $in: testScrimIds } }
      ]
    });
    console.log(`📊 Found ${testNotifications.length} test notifications`);

    // Delete all test data
    console.log('\n🗑️  Deleting test data...');

    await Chat.deleteMany({ _id: { $in: testChats.map(c => c._id) } });
    console.log(`✅ Deleted ${testChats.length} chats`);

    await Notification.deleteMany({ _id: { $in: testNotifications.map(n => n._id) } });
    console.log(`✅ Deleted ${testNotifications.length} notifications`);

    await Scrim.deleteMany({ _id: { $in: testScrimIds } });
    console.log(`✅ Deleted ${testScrims.length} scrims`);

    await Team.deleteMany({ _id: { $in: testTeamIds } });
    console.log(`✅ Deleted ${testTeams.length} teams`);

    await User.deleteMany({ _id: { $in: testUserIds } });
    console.log(`✅ Deleted ${testUsers.length} users`);

    console.log('\n✅ Test data cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupTestData();
