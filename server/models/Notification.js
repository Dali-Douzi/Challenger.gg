const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    scrim: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Scrim",
      required: true,
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScrimChat",
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["request", "accept", "decline", "accept-feedback", "message"],
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
notificationSchema.index({ scrim: 1 });
notificationSchema.index({ createdAt: -1 });
// Compound index for efficient queries on team notifications
notificationSchema.index({ team: 1, read: 1 });

module.exports = mongoose.model("Notification", notificationSchema);