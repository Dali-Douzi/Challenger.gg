const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const User = require("../models/User");
const chatService = require("../services/chatService");
const eventService = require("../services/eventService");

/**
 * ChatController - HTTP endpoints for chat operations
 */
class ChatController {
  /**
   * Check if user has access to a chat
   */
  async canAccessChat(userId, chat) {
    return chat.participants.some((p) => p.toString() === userId.toString());
  }

  /**
   * Get all chats for current user
   * @route GET /api/chats
   */
  async getUserChats(req, res) {
    try {
      const chats = await Chat.find({
        participants: req.user.userId,
      })
        .populate("participants", "username avatar")
        .populate("messages.sender", "username avatar")
        .sort({ lastMessageAt: -1 })
        .lean();

      // Add summary info for each chat
      const chatsWithInfo = chats.map((chat) => ({
        ...chat,
        lastMessage: chat.messages[chat.messages.length - 1] || null,
        messageCount: chat.messages.length,
        unreadCount: 0, // TODO: Implement read tracking
      }));

      return res.json({
        success: true,
        data: chatsWithInfo,
        count: chatsWithInfo.length,
      });
    } catch (error) {
      console.error("Error fetching user chats:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        ...(process.env.NODE_ENV === "development" && {
          error: error.message,
        }),
      });
    }
  }

  /**
   * Get specific chat by ID
   * @route GET /api/chats/:chatId
   */
  async getChatById(req, res) {
    const { chatId } = req.params;
    const limit = Math.max(parseInt(req.query.limit, 10) || 50, 1);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat ID format",
      });
    }

    try {
      const chat = await chatService.getChatById(chatId);

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found",
        });
      }

      // Check authorization
      if (!(await this.canAccessChat(req.user.userId, chat))) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this chat",
        });
      }

      // Sort & paginate messages
      const sortedMessages = chat.messages
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(skip, skip + limit);

      // Enhance messages with team info for scrim chats
      const enhancedMessages = sortedMessages.map((msg) => {
        const teamInfo = chatService.getTeamInfoForMessage(msg, chat);
        return {
          ...msg.toObject(),
          teamInfo,
        };
      });

      return res.json({
        success: true,
        data: {
          chat: {
            _id: chat._id,
            type: chat.type,
            participants: chat.participants,
            teamParticipants: chat.teamParticipants,
            metadata: chat.metadata,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
          },
          messages: enhancedMessages,
          pagination: {
            limit,
            skip,
            total: chat.messages.length,
            hasMore: skip + limit < chat.messages.length,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching chat:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        ...(process.env.NODE_ENV === "development" && {
          error: error.message,
        }),
      });
    }
  }

  /**
   * Send a message to a chat
   * @route POST /api/chats/:chatId/messages
   */
  async sendMessage(req, res) {
    const { chatId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message text is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat ID format",
      });
    }

    try {
      const chat = await Chat.findById(chatId);

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found",
        });
      }

      // Check authorization
      if (!(await this.canAccessChat(req.user.userId, chat))) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to send messages in this chat",
        });
      }

      // Determine sender's team (for scrim chats)
      const senderTeam = chatService.determineSenderTeam(req.user.userId, chat);

      // Create message
      const message = {
        sender: req.user.userId,
        senderTeam: senderTeam,
        text: text.trim(),
        timestamp: new Date(),
      };

      // Add to chat
      chat.messages.push(message);
      chat.lastMessageAt = message.timestamp;
      await chat.save();

      // Populate sender info
      const senderUser = await User.findById(req.user.userId).select(
        "username avatar"
      );

      const populatedMessage = {
        ...message,
        sender: senderUser,
      };

      // Get team info for response
      const teamInfo = chatService.getTeamInfoForMessage(message, chat);

      // Emit Socket.IO event to chat room
      const io = req.app.get("io");
      if (io) {
        io.to(chatId).emit("newMessage", {
          chatId,
          message: {
            ...populatedMessage,
            teamInfo,
          },
        });
        console.log(`💬 Emitted message to chat room: ${chatId}`);
      }

      // Emit event for notification service
      eventService.emitMessageSent({
        chatId: chat._id,
        chat: chat,
        message: populatedMessage,
        senderTeam,
        teamInfo,
      });

      return res.status(201).json({
        success: true,
        message: "Message sent",
        data: {
          ...populatedMessage,
          teamInfo,
        },
      });
    } catch (error) {
      console.error("Error sending message:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        ...(process.env.NODE_ENV === "development" && {
          error: error.message,
        }),
      });
    }
  }

  /**
   * Create a new chat
   * @route POST /api/chats
   */
  async createChat(req, res) {
    const { type, participants } = req.body;

    if (!type || !["dm", "group"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Valid chat type is required (dm or group)",
      });
    }

    if (!participants || !Array.isArray(participants) || participants.length < 2) {
      return res.status(400).json({
        success: false,
        message: "At least 2 participants are required",
      });
    }

    try {
      let chat;

      if (type === "dm") {
        // Use service to find or create DM
        chat = await chatService.createDMChat({
          user1: req.user.userId,
          user2: participants[0],
        });
      } else {
        // Create group chat
        chat = await Chat.create({
          type: "group",
          participants: [...participants, req.user.userId],
          metadata: req.body.metadata || {},
        });
      }

      await chat.populate("participants", "username avatar");

      return res.status(201).json({
        success: true,
        message: "Chat created",
        data: chat,
      });
    } catch (error) {
      console.error("Error creating chat:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        ...(process.env.NODE_ENV === "development" && {
          error: error.message,
        }),
      });
    }
  }

  /**
   * Get chat by scrim ID
   * @route GET /api/chats/scrim/:scrimId
   */
  async getChatByScrimId(req, res) {
    const { scrimId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(scrimId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid scrim ID format",
      });
    }

    try {
      const chat = await chatService.getChatByScrimId(scrimId);

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found for this scrim",
        });
      }

      // Check authorization
      if (!(await this.canAccessChat(req.user.userId, chat))) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this chat",
        });
      }

      return res.json({
        success: true,
        data: chat,
      });
    } catch (error) {
      console.error("Error fetching scrim chat:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        ...(process.env.NODE_ENV === "development" && {
          error: error.message,
        }),
      });
    }
  }
}

// Export singleton instance
module.exports = new ChatController();