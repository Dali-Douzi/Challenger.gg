const Chat = require("../models/Chat");
const Team = require("../models/Team");
const Scrim = require("../models/Scrim");
const eventService = require("./eventService");

/**
 * ChatService - Business logic for chat operations
 * Listens to events and creates chats accordingly
 */
class ChatService {
  constructor() {
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Scrim request created → Create chat
    eventService.on("scrim:request_created", async (data) => {
      try {
        await this.createScrimChat(data);
      } catch (error) {
        console.error("Error creating scrim chat:", error);
      }
    });

    // Team created → Create team chat (optional)
    eventService.on("team:created", async (data) => {
      try {
        // await this.createTeamChat(data);
        // Uncomment if you want automatic team chats
      } catch (error) {
        console.error("Error creating team chat:", error);
      }
    });

    // User DM request → Create DM
    eventService.on("user:dm_request", async (data) => {
      try {
        await this.createDMChat(data);
      } catch (error) {
        console.error("Error creating DM chat:", error);
      }
    });

    console.log("✅ ChatService event listeners initialized");
  }

  /**
   * Create scrim chat when scrim request is made
   */
  async createScrimChat({ scrimId, teamA, teamB, game }) {
    try {
      // Check if chat already exists
      const existingChat = await Chat.findOne({
        type: "scrim",
        "metadata.scrimId": scrimId,
      });

      if (existingChat) {
        console.log(`💬 Scrim chat already exists for scrim ${scrimId}`);
        return existingChat;
      }

      // Load both teams
      const hostTeam = await Team.findById(teamA).populate(
        "members.user",
        "_id username avatar"
      );
      const challengerTeam = await Team.findById(teamB).populate(
        "members.user",
        "_id username avatar"
      );

      if (!hostTeam || !challengerTeam) {
        throw new Error("One or both teams not found");
      }

      // Collect all participants
      const hostMembers = [
        hostTeam.owner,
        ...hostTeam.members.map((m) => m.user._id),
      ];
      const challengerMembers = [
        challengerTeam.owner,
        ...challengerTeam.members.map((m) => m.user._id),
      ];

      const allParticipants = [...hostMembers, ...challengerMembers];

      // Remove duplicates
      const uniqueParticipants = [
        ...new Set(allParticipants.map((p) => p.toString())),
      ];

      // Create chat with team context
      const chat = await Chat.create({
        type: "scrim",
        participants: uniqueParticipants,

        // Team structure
        teamParticipants: [
          {
            team: hostTeam._id,
            role: "host",
          },
          {
            team: challengerTeam._id,
            role: "challenger",
          },
        ],

        // Rich metadata for frontend
        metadata: {
          scrimId,
          game,
          teams: {
            host: {
              id: hostTeam._id,
              name: hostTeam.name,
              logo: hostTeam.logo,
              memberIds: hostMembers.map((m) => m.toString()),
            },
            challenger: {
              id: challengerTeam._id,
              name: challengerTeam.name,
              logo: challengerTeam.logo,
              memberIds: challengerMembers.map((m) => m.toString()),
            },
          },
        },
      });

      console.log(`💬 Created scrim chat ${chat._id} for scrim ${scrimId}`);

      // Emit chat created event
      eventService.emitChatCreated({
        chatId: chat._id,
        type: "scrim",
        scrimId,
      });

      return chat;
    } catch (error) {
      console.error("Error in createScrimChat:", error);
      throw error;
    }
  }

  /**
   * Create or find DM chat between two users
   */
  async createDMChat({ user1, user2 }) {
    try {
      // Check if DM already exists
      const existingChat = await Chat.findOne({
        type: "dm",
        participants: { $all: [user1, user2], $size: 2 },
      });

      if (existingChat) {
        console.log(`💬 DM chat already exists between ${user1} and ${user2}`);
        return existingChat;
      }

      // Create new DM
      const chat = await Chat.create({
        type: "dm",
        participants: [user1, user2],
        messages: [],
      });

      console.log(`💬 Created DM chat ${chat._id} between ${user1} and ${user2}`);

      eventService.emitChatCreated({
        chatId: chat._id,
        type: "dm",
        participants: [user1, user2],
      });

      return chat;
    } catch (error) {
      console.error("Error in createDMChat:", error);
      throw error;
    }
  }

  /**
   * Create team chat (internal team communication)
   */
  async createTeamChat({ teamId, teamName }) {
    try {
      // Check if team chat already exists
      const existingChat = await Chat.findOne({
        type: "team",
        "metadata.teamId": teamId,
      });

      if (existingChat) {
        console.log(`💬 Team chat already exists for team ${teamId}`);
        return existingChat;
      }

      // Load team
      const team = await Team.findById(teamId).populate(
        "members.user",
        "_id username avatar"
      );

      if (!team) {
        throw new Error("Team not found");
      }

      // Collect all team members
      const participants = [
        team.owner,
        ...team.members.map((m) => m.user._id),
      ];

      // Create team chat
      const chat = await Chat.create({
        type: "team",
        participants,
        teamParticipants: [
          {
            team: team._id,
            role: "member",
          },
        ],
        metadata: {
          teamId,
          teamName: team.name,
          teamLogo: team.logo,
        },
      });

      console.log(`💬 Created team chat ${chat._id} for team ${teamId}`);

      eventService.emitChatCreated({
        chatId: chat._id,
        type: "team",
        teamId,
      });

      return chat;
    } catch (error) {
      console.error("Error in createTeamChat:", error);
      throw error;
    }
  }

  /**
   * Get chat by ID with full population
   */
  async getChatById(chatId) {
    return Chat.findById(chatId)
      .populate("participants", "username avatar")
      .populate("messages.sender", "username avatar")
      .populate("teamParticipants.team", "name logo");
  }

  /**
   * Get chat for a scrim
   */
  async getChatByScrimId(scrimId) {
    return Chat.findOne({
      type: "scrim",
      "metadata.scrimId": scrimId,
    })
      .populate("participants", "username avatar")
      .populate("messages.sender", "username avatar");
  }

  /**
   * Determine which team a user belongs to in a chat
   */
  determineSenderTeam(userId, chat) {
    if (chat.type !== "scrim" || !chat.metadata.teams) {
      return null;
    }

    const { host, challenger } = chat.metadata.teams;

    if (host.memberIds.includes(userId.toString())) {
      return host.id;
    }

    if (challenger.memberIds.includes(userId.toString())) {
      return challenger.id;
    }

    return null;
  }

  /**
   * Get team info for a message (for frontend display)
   */
  getTeamInfoForMessage(message, chat) {
    if (!message.senderTeam || !chat.metadata.teams) {
      return null;
    }

    const { host, challenger } = chat.metadata.teams;

    if (message.senderTeam.toString() === host.id.toString()) {
      return {
        teamId: host.id,
        teamName: host.name,
        teamLogo: host.logo,
        role: "host",
      };
    }

    if (message.senderTeam.toString() === challenger.id.toString()) {
      return {
        teamId: challenger.id,
        teamName: challenger.name,
        teamLogo: challenger.logo,
        role: "challenger",
      };
    }

    return null;
  }
}

// Export singleton instance
module.exports = new ChatService();