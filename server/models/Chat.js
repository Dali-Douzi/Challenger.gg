const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: false, // Only for scrim/team chats
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { _id: true }
);

const chatSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["dm", "scrim", "team", "group"],
      required: true,
      index: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    teamParticipants: [
      {
        team: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Team",
        },
        role: {
          type: String,
          enum: ["host", "challenger", "member"],
        },
      },
    ],
    messages: {
      type: [messageSchema],
      default: [],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // For scrim: { scrimId, game, teams: { host: {...}, challenger: {...} } }
      // For team: { teamId, teamName }
      // For group: { name, avatar, description }
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
chatSchema.index({ participants: 1, lastMessageAt: -1 });
chatSchema.index({ type: 1, participants: 1 });
chatSchema.index({ "metadata.scrimId": 1 }, { sparse: true });
chatSchema.index({ "metadata.teamId": 1 }, { sparse: true });
chatSchema.index({ "messages.timestamp": -1 });
chatSchema.index({ lastMessageAt: -1 });

// Compound index for DM uniqueness
chatSchema.index(
  { type: 1, participants: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "dm" },
  }
);

// Method to add a message with team context
chatSchema.methods.addMessage = function (senderId, text, senderTeam = null) {
  this.messages.push({
    sender: senderId,
    senderTeam: senderTeam,
    text: text.trim(),
    timestamp: new Date(),
  });
  this.lastMessageAt = new Date();
  return this.save();
};

// Static method to find or create DM chat
chatSchema.statics.findOrCreateDM = async function (user1Id, user2Id) {
  let chat = await this.findOne({
    type: "dm",
    participants: { $all: [user1Id, user2Id], $size: 2 },
  });

  if (!chat) {
    chat = await this.create({
      type: "dm",
      participants: [user1Id, user2Id],
      messages: [],
    });
  }

  return chat;
};

module.exports = mongoose.model("Chat", chatSchema);