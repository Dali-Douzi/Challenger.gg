const express = require("express");
const passport = require("passport");
const oauthController = require("../controllers/oauthController");
const router = express.Router();

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  oauthController.googleCallback
);

// Discord OAuth routes
router.get("/discord", passport.authenticate("discord"));

router.get(
  "/discord/callback",
  passport.authenticate("discord", { session: false }),
  oauthController.discordCallback
);

// Twitch OAuth routes
router.get(
  "/twitch",
  passport.authenticate("twitch", { scope: "user:read:email" })
);

router.get(
  "/twitch/callback",
  passport.authenticate("twitch", { session: false }),
  oauthController.twitchCallback
);

// Linked accounts management
router.get("/linked-accounts", oauthController.getLinkedAccounts);
router.delete("/unlink/:provider", oauthController.unlinkProvider);

module.exports = router;