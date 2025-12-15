const Chat = require("../models/Chat");
const Team = require("../models/Team");
const Scrim = require("../models/Scrim");
const mongoose = require("mongoose");
const eventService = require("../services/eventService");
const chatService = require("../services/chatService");

/**
 * Get all chats for the current user
 */
exports.getUserChats = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    console.log("💬 [GET-CHATS] Fetching chats for user:", userId);

    const chats = await Chat.find({
      participants: userId,
    })
      .populate("participants", "username avatar email")
      .populate("messages.sender", "username avatar")
      .populate("messages.senderTeam", "name logo")
      .populate("teamParticipants.team", "name logo")
      .sort({ lastMessageAt: -1 })
      .lean();

    console.log("✅ [GET-CHATS] Found chats:", chats.length);

    // Enrich chat data with team info for display
    const enrichedChats = chats.map((chat) => {
      if (chat.type === "scrim" && chat.metadata?.teams) {
        return {
          ...chat,
          title: `${chat.metadata.teams.host.name} vs ${chat.metadata.teams.challenger.name}`,
          avatar: null,
        };
      }

      if (chat.type === "team" && chat.metadata?.teamName) {
        return {
          ...chat,
          title: chat.metadata.teamName,
          avatar: chat.metadata.teamLogo,
        };
      }

      if (chat.type === "dm") {
        const otherUser = chat.participants.find(
          (p) => p._id.toString() !== userId.toString()
        );
        return {
          ...chat,
          title: otherUser?.username || "Unknown User",
          avatar: otherUser?.avatar,
        };
      }

      return chat;
    });

    res.status(200).json({
      success: true,
      data: enrichedChats,
      count: enrichedChats.length,
    });
  } catch (error) {
    console.error("❌ [GET-CHATS] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching chats",
      error: error.message,
    });
  }
};

/**
 * Create a new chat (DM or group)
 */
exports.createChat = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { type, participants } = req.body;

    console.log("💬 [CREATE-CHAT] Request:", { userId, type, participants });

    if (!type || !participants || !Array.isArray(participants)) {
      return res.status(400).json({
        success: false,
        message: "Please provide type and participants array",
      });
    }

    // For DM, use the helper method
    if (type === "dm") {
      if (participants.length !== 1) {
        return res.status(400).json({
          success: false,
          message: "DM must have exactly one other participant",
        });
      }

      const chat = await Chat.findOrCreateDM(userId, participants[0]);

      const populatedChat = await Chat.findById(chat._id)
        .populate("participants", "username avatar email")
        .populate("messages.sender", "username avatar");

      console.log("✅ [CREATE-CHAT] DM chat created/found:", chat._id);

      return res.status(200).json({
        success: true,
        data: populatedChat,
        created: chat.messages.length === 0,
      });
    }

    // For other types, create normally
    const allParticipants = [userId, ...participants];

    const chat = await Chat.create({
      type,
      participants: allParticipants,
      messages: [],
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate("participants", "username avatar email")
      .populate("messages.sender", "username avatar");

    console.log("✅ [CREATE-CHAT] Chat created:", chat._id);

    res.status(201).json({
      success: true,
      data: populatedChat,
      created: true,
    });
  } catch (error) {
    console.error("❌ [CREATE-CHAT] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating chat",
      error: error.message,
    });
  }
};

/**
 * Get chat by scrim ID
 */
exports.getChatByScrimId = async (req, res) => {
  try {
    const { scrimId } = req.params;
    const userId = req.user.userId || req.user.id;

    console.log("💬 [GET-CHAT-BY-SCRIM] Request:", { scrimId, userId });

    if (!mongoose.Types.ObjectId.isValid(scrimId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid scrim ID",
      });
    }

    const chat = await Chat.findOne({
      type: "scrim",
      "metadata.scrimId": scrimId,
    })
      .populate("participants", "username avatar email")
      .populate("messages.sender", "username avatar")
      .populate("messages.senderTeam", "name logo")
      .populate("teamParticipants.team", "name logo");

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

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this chat",
      });
    }

    console.log("✅ [GET-CHAT-BY-SCRIM] Chat found:", chat._id);

    res.status(200).json({
      success: true,
      data: chat,
    });
  } catch (error) {
    console.error("❌ [GET-CHAT-BY-SCRIM] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching chat",
      error: error.message,
    });
  }
};

/**
 * Get specific chat by ID
 */
exports.getChatById = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.userId || req.user.id;

    console.log("💬 [GET-CHAT] Request:", { chatId, userId });

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat ID",
      });
    }

    const chat = await Chat.findById(chatId)
      .populate("participants", "username avatar email")
      .populate("messages.sender", "username avatar")
      .populate("messages.senderTeam", "name logo")
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
        message: "Not authorized to access this chat",
      });
    }

    console.log("✅ [GET-CHAT] Chat found:", chat._id);

    res.status(200).json({
      success: true,
      data: chat,
    });
  } catch (error) {
    console.error("❌ [GET-CHAT] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching chat",
      error: error.message,
    });
  }
};

/**
 * Send a message to a chat
 */
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text } = req.body;
    const userId = req.user.userId || req.user.id;

    console.log("💬 [SEND-MESSAGE] Request:", { chatId, userId, textLength: text?.length });

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat ID",
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message text is required",
      });
    }

    const chat = await Chat.findById(chatId)
      .populate("participants", "username avatar email")
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
        message: "Not authorized to send messages in this chat",
      });
    }

    // Determine sender's team (for scrim chats)
    let senderTeam = null;
    let teamInfo = null;

    if (chat.type === "scrim") {
      senderTeam = chatService.determineSenderTeam(userId, chat);
      
      if (chat.metadata?.teams) {
        const { host, challenger } = chat.metadata.teams;
        
        if (senderTeam && senderTeam.toString() === host.id.toString()) {
          teamInfo = {
            teamId: host.id,
            teamName: host.name,
            teamLogo: host.logo,
            role: "host",
          };
        } else if (senderTeam && senderTeam.toString() === challenger.id.toString()) {
          teamInfo = {
            teamId: challenger.id,
            teamName: challenger.name,
            teamLogo: challenger.logo,
            role: "challenger",
          };
        }
      }
    }

    // Add message using model method
    await chat.addMessage(userId, text, senderTeam);

    // Get the newly added message
    const newMessage = chat.messages[chat.messages.length - 1];

    // Emit real-time message via Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.to(chatId).emit("newMessage", {
        chatId: chatId,
        message: {
          _id: newMessage._id,
          sender: {
            _id: userId,
            username: req.user.username || "Unknown",
          },
          senderTeam: teamInfo,
          text: newMessage.text,
          timestamp: newMessage.timestamp,
        },
      });
      console.log("📤 [SEND-MESSAGE] Emitted to room:", chatId);
    }

    // Emit event for notification service
    eventService.emitMessageSent({
      chatId,
      chat,
      message: newMessage,
      senderTeam,
      teamInfo,
    });

    // Populate the updated chat
    const updatedChat = await Chat.findById(chatId)
      .populate("participants", "username avatar email")
      .populate("messages.sender", "username avatar")
      .populate("messages.senderTeam", "name logo")
      .populate("teamParticipants.team", "name logo");

    console.log("✅ [SEND-MESSAGE] Message sent successfully");

    res.status(200).json({
      success: true,
      data: updatedChat,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("❌ [SEND-MESSAGE] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error sending message",
      error: error.message,
    });
  }
};