const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Game name is required"],
      unique: true,
      trim: true,
    },
    servers: {
      type: [String],
      required: [true, "At least one server is required"],
      validate: {
        validator: function (servers) {
          return servers.length > 0;
        },
        message: "Game must have at least one server",
      },
    },
    ranks: {
      type: [String],
      required: [true, "At least one rank is required"],
      validate: {
        validator: function (ranks) {
          return ranks.length > 0;
        },
        message: "Game must have at least one rank",
      },
    },
    formats: {
      type: [String],
      required: [true, "At least one format is required"],
      validate: {
        validator: function (formats) {
          return formats.length > 0;
        },
        message: "Game must have at least one format",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
gameSchema.index({ name: 1 });

module.exports = mongoose.model("Game", gameSchema);