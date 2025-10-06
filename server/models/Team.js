const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["player", "manager", "substitute", "owner"],
      default: "player",
    },
    rank: {
      type: String,
      required: true,
    },
  },
  { _id: true }
);

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Team name is required"],
      unique: true,
      trim: true,
    },
    game: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Game",
      required: [true, "Game is required"],
    },
    rank: {
      type: String,
      required: [true, "Rank is required"],
    },
    teamCode: {
      type: String,
      unique: true,
      uppercase: true,
      required: true,
    },
    server: {
      type: String,
      required: [true, "Server/Region is required"],
    },
    description: {
      type: String,
      default: "",
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    logo: {
      type: String,
      default: "",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Team owner is required"],
    },
    members: {
      type: [memberSchema],
      validate: {
        validator: function (members) {
          return members.length > 0;
        },
        message: "Team must have at least one member",
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
teamSchema.index({ name: 1 });
teamSchema.index({ teamCode: 1 });
teamSchema.index({ owner: 1 });
teamSchema.index({ game: 1 });
teamSchema.index({ "members.user": 1 });

// Virtual for member count
teamSchema.virtual("memberCount").get(function () {
  return this.members.length;
});

module.exports = mongoose.model("Team", teamSchema);