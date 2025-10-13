const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
  },
  { _id: true }
);

const scrimChatSchema = new mongoose.Schema(
  {
    scrim: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Scrim",
      required: true,
      unique: true,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
scrimChatSchema.index({ scrim: 1 });
scrimChatSchema.index({ "messages.timestamp": -1 });

module.exports = mongoose.model("ScrimChat", scrimChatSchema);