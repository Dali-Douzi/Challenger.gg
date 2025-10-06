const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters long"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
    },
    avatar: {
      type: String,
      default: "",
    },
    teams: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Team",
      default: [],
    },
    // OAuth provider IDs
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    discordId: {
      type: String,
      sparse: true,
      unique: true,
    },
    twitchId: {
      type: String,
      sparse: true,
      unique: true,
    },
    // Primary authentication provider
    authProvider: {
      type: String,
      enum: ["local", "google", "discord", "twitch"],
      default: "local",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        return ret;
      },
    },
  }
);

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ discordId: 1 }, { sparse: true });
userSchema.index({ twitchId: 1 }, { sparse: true });

module.exports = mongoose.model("User", userSchema);