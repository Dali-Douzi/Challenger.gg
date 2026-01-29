const Chat = require("../models/Chat");
const Team = require("../models/Team");
const Notification = require("../models/Notification");
const chatService = require("../services/chatService");

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

// Feature: Chat system - retrieves scrim chat by scrim ID for coordinating match details
exports.getChatByScrimId = async (req, res) => {
  try {
    const { scrimId } = req.params;
    const userId = req.user.userId || req.user.id;

    const mongoose = require("mongoose");
    const scrimObjectId = mongoose.Types.ObjectId.isValid(scrimId)
      ? new mongoose.Types.ObjectId(scrimId)
      : scrimId;

    const chat = await Chat.findOne({
      type: "scrim",
      "metadata.scrimId": scrimObjectId,
    })
      .populate("participants", "username avatar")
      .populate("messages.sender", "username avatar")
      .populate("teamParticipants.team", "name logo");

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found for this scrim",
      });
    }

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
    console.error("Get chat by scrim ID error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching chat",
      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
      }),
    });
  }
};

// Feature: Chat system - sends message and emits real-time socket event to all participants
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

    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to send messages in this chat",
      });
    }

    let senderTeam = null;
    if (chat.type === "scrim") {
      senderTeam = chatService.determineSenderTeam(userId, chat);
    }

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

    await chat.populate("messages.sender", "username avatar");
    const newMessage = chat.messages[chat.messages.length - 1];

    // Feature: Real-time socket notification when new message is sent
    const io = req.app.get("io");
    if (io) {
      io.to(chatId).emit("newMessage", {
        chatId: chat._id,
        message: newMessage,
      });
    }

    const otherParticipants = chat.participants.filter(
      (p) => p.toString() !== userId.toString()
    );

    if (chat.type === "scrim" && chat.metadata?.scrimId) {
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

    let canDelete = false;

    if (chat.type === "scrim") {
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
      canDelete = chat.participants.some(
        (p) => p.toString() === userId.toString()
      );
    } else if (chat.type === "team") {
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

    await Notification.deleteMany({ chat: chatId });

    // Feature: Real-time socket notification when chat is deleted
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
