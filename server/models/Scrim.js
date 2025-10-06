const mongoose = require("mongoose");

const scrimSchema = new mongoose.Schema(
  {
    teamA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: [true, "Posting team (teamA) is required"],
    },
    teamB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    },
    game: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Game",
      required: [true, "Game is required"],
    },
    format: {
      type: String,
      required: [true, "Format is required"],
    },
    scheduledTime: {
      type: Date,
      required: [true, "Scheduled time is required"],
      validate: {
        validator: function (value) {
          return value > new Date();
        },
        message: "Scheduled time must be in the future",
      },
    },
    status: {
      type: String,
      enum: ["open", "pending", "booked"],
      default: "open",
    },
    requests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
scrimSchema.index({ teamA: 1 });
scrimSchema.index({ teamB: 1 });
scrimSchema.index({ game: 1 });
scrimSchema.index({ status: 1 });
scrimSchema.index({ scheduledTime: 1 });
scrimSchema.index({ createdAt: -1 });

// Virtual for checking if scrim is in the past
scrimSchema.virtual("isPast").get(function () {
  return this.scheduledTime < new Date();
});

// Virtual for request count
scrimSchema.virtual("requestCount").get(function () {
  return this.requests ? this.requests.length : 0;
});

module.exports = mongoose.model("Scrim", scrimSchema);