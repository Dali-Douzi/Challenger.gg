const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // Can be sent to a team OR a user
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    scrim: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Scrim",
    },
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "request",
        "accept",
        "decline",
        "accept-feedback",
        "message",
        "tournament_join_request",
        "tournament_approved",
        "tournament_denied",
        "tournament_registration_locked",
      ],
      default: "request",
    },
    url: {
      type: String,
      default: "",
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ ENHANCED INDEXES for better performance
notificationSchema.index({ team: 1, read: 1, createdAt: -1 });
notificationSchema.index({ team: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ scrim: 1 });
notificationSchema.index({ tournament: 1 });
notificationSchema.index({ createdAt: -1 });
// Compound index for efficient queries on team notifications
notificationSchema.index({ team: 1, read: 1 });
notificationSchema.index({ user: 1, read: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
