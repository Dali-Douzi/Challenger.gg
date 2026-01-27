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
    console.log("🚀 [ChatService] Constructor called - initializing service");
    this.setupEventListeners();
    console.log("🚀 [ChatService] Constructor complete");
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // ✅ FIXED: Create chat when scrim REQUEST is made (not acceptance)
    // This allows teams to communicate BEFORE accepting
    eventService.on("scrim:request_created", async (data) => {
      try {
        console.log("📨 [CHAT-SERVICE] ========== SCRIM REQUEST EVENT RECEIVED ==========");
        console.log("📨 [CHAT-SERVICE] Event data:", JSON.stringify(data, null, 2));
        console.log("📨 [CHAT-SERVICE] Creating chat for scrim:", data.scrimId);
        const chat = await this.createScrimChat(data);
        console.log("✅ [CHAT-SERVICE] Chat created successfully:", chat._id);
      } catch (error) {
        console.error("❌ [CHAT-SERVICE] Error creating scrim chat:", error);
        console.error("❌ [CHAT-SERVICE] Error stack:", error.stack);
      }
    });

    // Update chat metadata when scrim is accepted
    eventService.on("scrim:accepted", async (data) => {
      try {
        console.log("✅ [CHAT-SERVICE] Scrim accepted, updating chat:", data.scrimId);
        
        const chat = await Chat.findOne({
          type: "scrim",
          "metadata.scrimId": data.scrimId,
        });

        if (chat) {
          chat.metadata.status = "accepted";
          chat.metadata.acceptedAt = new Date();
          await chat.save();
          console.log("✅ [CHAT-SERVICE] Chat metadata updated");
        } else {
          console.warn("⚠️ [CHAT-SERVICE] Chat not found, creating new one");
          await this.createScrimChat(data);
        }
      } catch (error) {
        console.error("❌ [CHAT-SERVICE] Error updating chat:", error);
      }
    });

    // Team created → Create team chat (optional)
    eventService.on("team:created", async (data) => {
      try {
        // await this.createTeamChat(data);
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
      console.log(`📨 [createScrimChat] Starting chat creation for scrim: ${scrimId}`);
      console.log(`📨 [createScrimChat] Teams - Host: ${teamA}, Challenger: ${teamB}`);

      const existingChat = await Chat.findOne({
        type: "scrim",
        "metadata.scrimId": scrimId,
      });

      if (existingChat) {
        console.log(`💬 [createScrimChat] Scrim chat already exists: ${existingChat._id}`);
        return existingChat;
      }

      console.log(`📨 [createScrimChat] No existing chat found, creating new one...`);

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

      // ✅ FIXED: Members array already includes owner
      const hostMembers = hostTeam.members.map((m) => m.user._id || m.user);
      const challengerMembers = challengerTeam.members.map((m) => m.user._id || m.user);

      const allParticipants = [...hostMembers, ...challengerMembers];
      const uniqueParticipants = [
        ...new Set(allParticipants.map((p) => (p.toString ? p.toString() : p))),
      ];

      console.log(`👥 Creating chat with ${uniqueParticipants.length} participants`);

      const chat = await Chat.create({
        type: "scrim",
        participants: uniqueParticipants,
        teamParticipants: [
          { team: hostTeam._id, role: "host" },
          { team: challengerTeam._id, role: "challenger" },
        ],
        metadata: {
          scrimId,
          game,
          status: "pending",
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

      eventService.emitChatCreated({
        chatId: chat._id,
        type: "scrim",
        scrimId,
      });

      const io = eventService.getIO();
      if (io) {
        uniqueParticipants.forEach(userId => {
          io.to(`user:${userId}`).emit("chatCreated", {
            chatId: chat._id,
            scrimId: scrimId,
          });
        });
      }

      return chat;
    } catch (error) {
      console.error("Error in createScrimChat:", error);
      throw error;
    }
  }

  async createDMChat({ user1, user2 }) {
    try {
      const existingChat = await Chat.findOne({
        type: "dm",
        participants: { $all: [user1, user2], $size: 2 },
      });

      if (existingChat) {
        console.log(`💬 DM chat already exists between ${user1} and ${user2}`);
        return existingChat;
      }

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

  async createTeamChat({ teamId, teamName }) {
    try {
      const existingChat = await Chat.findOne({
        type: "team",
        "metadata.teamId": teamId,
      });

      if (existingChat) {
        console.log(`💬 Team chat already exists for team ${teamId}`);
        return existingChat;
      }

      const team = await Team.findById(teamId).populate(
        "members.user",
        "_id username avatar"
      );

      if (!team) {
        throw new Error("Team not found");
      }

      const participants = team.members.map((m) => m.user._id || m.user);

      const chat = await Chat.create({
        type: "team",
        participants,
        teamParticipants: [{ team: team._id, role: "member" }],
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

  async getChatById(chatId) {
    return Chat.findById(chatId)
      .populate("participants", "username avatar")
      .populate("messages.sender", "username avatar")
      .populate("teamParticipants.team", "name logo");
  }

  async getChatByScrimId(scrimId) {
    return Chat.findOne({
      type: "scrim",
      "metadata.scrimId": scrimId,
    })
      .populate("participants", "username avatar")
      .populate("messages.sender", "username avatar");
  }

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

module.exports = new ChatService();