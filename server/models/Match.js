const mongoose = require("mongoose");
const { Schema } = mongoose;

const matchSchema = new Schema(
  {
    tournament: {
      type: Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    phaseIndex: {
      type: Number,
      required: true,
    },
    slot: {
      type: Number,
      required: true,
    },
    teamA: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },
    teamB: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },
    scheduledAt: {
      type: Date,
    },
    format: {
      type: String,
      trim: true,
    },
    scoreA: {
      type: Number,
      default: null,
    },
    scoreB: {
      type: Number,
      default: null,
    },
    winner: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },
    loser: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },
    roundNumber: {
      type: Number,
      default: 0,
    },
    bracketPosition: {
      type: String,
      default: "",
    },
    seed: {
      type: Number,
      default: null,
    },
    nextMatchId: {
      type: Schema.Types.ObjectId,
      ref: "Match",
      default: null,
    },
    nextMatchForLoser: {
      type: Schema.Types.ObjectId,
      ref: "Match",
      default: null,
    },
    status: {
      type: String,
      enum: ["PENDING", "SCHEDULED", "IN_PROGRESS", "COMPLETED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Match", matchSchema);