const express = require("express");
const Game = require("./models/Game");
const router = express.Router();

// Get all games
router.get("/", async (req, res) => {
  try {
    res.set({
      "Cache-Control": "public, max-age=300",
    });

    const games = await Game.find({}).lean();

    res.json({
      success: true,
      count: games.length,
      data: games,
    });
  } catch (error) {
    console.error("Fetch Games Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching games",
      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
      }),
    });
  }
});

// Get single game by ID
router.get("/:id", async (req, res) => {
  try {
    const game = await Game.findById(req.params.id).lean();

    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    res.json({
      success: true,
      data: game,
    });
  } catch (error) {
    console.error("Fetch Game Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching game",
      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
      }),
    });
  }
});

module.exports = router;