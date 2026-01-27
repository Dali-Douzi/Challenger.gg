const Chat = require("../models/Chat");
const Team = require("../models/Team");
const Notification = require("../models/Notification");
const chatService = require("../services/chatService");

/**
 * Get all chats for the current user
 */
exports.getUserChats = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const chats = await Chat.find({
      participants: userId,
    })
      .populate("participants", "username avatar")
      .populate("teamParticipants.team", "name logo")
      .sort({ lastMessageAt: -1 })
      .lean();

    // Add unread count for each chat
    const chatsWithUnread = chats.map((chat) => {
      const unreadCount = chat.messages?.filter(
        (msg) =>
          !msg.readBy?.some((r) => r.user?.toString() === userId.toString()) &&
          msg.sender.toString() !== userId.toString()
      ).length || 0;

      return {
        ...chat,
        unreadCount,
      };
    });

    res.json({
      success: true,
      data: chatsWithUnread,
      count: chatsWithUnread.length,
    });
  } catch (error) {
    console.error("Get user chats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching chats",
      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
      }),
    });
  }
};

/**
 * Get chat by ID
 */
exports.getChatById = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.userId || req.user.id;

    const chat = await Chat.findById(chatId)
      .populate("participants", "username avatar")
      .populate("messages.sender", "username avatar")
      .populate("teamParticipants.team", "name logo");

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      (p) => p._id.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this chat",
      });
    }

    res.json({
      success: true,
      data: chat,
    });
  } catch (error) {
    console.error("Get chat error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching chat",
      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
      }),
    });
  }
};

/**
 * Get chat by scrim ID (fallback for ScrimRequests.jsx)
 */
exports.getChatByScrimId = async (req, res) => {
  try {
    console.log("🔍 [getChatByScrimId] ========== GET CHAT REQUEST ==========");
    const { scrimId } = req.params;
    const userId = req.user.userId || req.user.id;
    console.log("🔍 [getChatByScrimId] Request params - scrimId:", scrimId);
    console.log("🔍 [getChatByScrimId] Request userId:", userId);

    // Convert scrimId to ObjectId for MongoDB query
    const mongoose = require("mongoose");
    const scrimObjectId = mongoose.Types.ObjectId.isValid(scrimId)
      ? new mongoose.Types.ObjectId(scrimId)
      : scrimId;

    console.log("🔍 [getChatByScrimId] Querying for chat with:", {
      type: "scrim",
      "metadata.scrimId": scrimObjectId
    });

    const chat = await Chat.findOne({
      type: "scrim",
      "metadata.scrimId": scrimObjectId,
    })
      .populate("participants", "username avatar")
      .populate("messages.sender", "username avatar")
      .populate("teamParticipants.team", "name logo");

    console.log("🔍 [getChatByScrimId] Query result - chat found:", !!chat);
    if (chat) {
      console.log("🔍 [getChatByScrimId] Chat details:", {
        chatId: chat._id,
        type: chat.type,
        participants: chat.participants.map(p => p._id),
        metadata: chat.metadata
      });
    } else {
      console.log("❌ [getChatByScrimId] No chat found in database");
      // Let's check what chats exist
      const allScrimChats = await Chat.find({ type: "scrim" }, "metadata.scrimId");
      console.log("🔍 [getChatByScrimId] All scrim chats in DB:", allScrimChats.map(c => ({
        id: c._id,
        scrimId: c.metadata?.scrimId
      })));
    }

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found for this scrim",
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      (p) => p._id.toString() === userId.toString()
    );
    console.log("🔍 [getChatByScrimId] User is participant:", isParticipant);

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this chat",
      });
    }

    console.log("✅ [getChatByScrimId] Returning chat successfully");
    res.json({
      success: true,
      data: chat,
    });
  } catch (error) {
    console.error("❌ [getChatByScrimId] Error:", error);
    console.error("❌ [getChatByScrimId] Stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Error fetching chat",
      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
      }),
    });
  }
};

/**
 * Send message
 */
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;
    const userId = req.user.userId || req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to send messages in this chat",
      });
    }

    // Determine sender team for scrim chats
    let senderTeam = null;
    if (chat.type === "scrim") {
      senderTeam = chatService.determineSenderTeam(userId, chat);
    }

    // Create message
    const message = {
      sender: userId,
      text: content.trim(),
      senderTeam: senderTeam,
      readBy: [{ user: userId, readAt: new Date() }],
      timestamp: new Date(),
    };

    chat.messages.push(message);
    chat.lastMessageAt = new Date();
    await chat.save();

    // Populate the new message
    await chat.populate("messages.sender", "username avatar");
    const newMessage = chat.messages[chat.messages.length - 1];

    // Emit Socket.IO event to all participants
    const io = req.app.get("io");
    if (io) {
      io.to(chatId).emit("newMessage", {
        chatId: chat._id,
        message: newMessage,
      });
    }

    // Create notifications for other participants
    const otherParticipants = chat.participants.filter(
      (p) => p.toString() !== userId.toString()
    );

    if (chat.type === "scrim" && chat.metadata?.scrimId) {
      // For scrim chats, create team-based notifications
      const senderUser = await require("../models/User").findById(userId);
      
      for (const participantId of otherParticipants) {
        const participantTeam = chatService.determineSenderTeam(participantId, chat);
        
        if (participantTeam) {
          await Notification.create({
            team: participantTeam,
            scrim: chat.metadata.scrimId,
            chat: chat._id,
            message: `${senderUser.username} sent a message`,
            type: "message",
            url: `/scrims?openChat=${chat.metadata.scrimId}`,
          });

          // Emit notification
          if (io) {
            io.to(`team:${participantTeam}`).emit("newNotification", {
              teamId: participantTeam,
              notification: {
                message: `${senderUser.username} sent a message`,
                type: "message",
                url: `/chats/${chat._id}`,
              },
            });
          }
        }
      }
    }

    res.json({
      success: true,
      message: "Message sent successfully",
      data: newMessage,
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      success: false,
      message: "Error sending message",
      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
      }),
    });
  }
};

/**
 * Mark chat as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.userId || req.user.id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    // Mark all messages as read by this user
    chat.messages.forEach((message) => {
      if (!message.readBy.some((r) => r.user.toString() === userId.toString())) {
        message.readBy.push({ user: userId, readAt: new Date() });
      }
    });

    await chat.save();

    res.json({
      success: true,
      message: "Chat marked as read",
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      success: false,
      message: "Error marking chat as read",
      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
      }),
    });
  }
};

/**
 * Delete chat
 */
exports.deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.userId || req.user.id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    // Permission check based on chat type
    let canDelete = false;

    if (chat.type === "scrim") {
      // For scrim chats, only team owners/managers can delete
      const userTeams = await Team.find({
        $or: [
          { owner: userId },
          { "members.user": userId, "members.role": { $in: ["manager", "owner"] } },
        ],
      });

      const teamIds = userTeams.map((t) => t._id.toString());
      const chatTeamIds = chat.teamParticipants.map((tp) =>
        tp.team.toString()
      );

      canDelete = chatTeamIds.some((id) => teamIds.includes(id));
    } else if (chat.type === "dm") {
      // For DMs, any participant can delete
      canDelete = chat.participants.some(
        (p) => p.toString() === userId.toString()
      );
    } else if (chat.type === "team") {
      // For team chats, only team owner can delete
      const team = await Team.findById(chat.metadata.teamId);
      canDelete = team && team.owner.toString() === userId.toString();
    }

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this chat",
      });
    }

    await Chat.findByIdAndDelete(chatId);

    // Delete related notifications
    await Notification.deleteMany({ chat: chatId });

    // Emit Socket.IO event
    const io = req.app.get("io");
    if (io) {
      io.to(chatId).emit("chatDeleted", {
        chatId: chatId,
        message: "This chat has been deleted",
      });
    }

    res.json({
      success: true,
      message: "Chat deleted successfully",
    });
  } catch (error) {
    console.error("Delete chat error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting chat",
      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
      }),
    });
  }
};