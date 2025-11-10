const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const chatController = require("../controllers/chatController");

/**
 * @desc    Get all chats for current user
 * @route   GET /api/chats
 * @access  Private
 */
router.get("/", protect, (req, res) => chatController.getUserChats(req, res));

/**
 * @desc    Create a new chat (DM or group)
 * @route   POST /api/chats
 * @access  Private
 * @body    { type: "dm", participants: [userId] }
 */
router.post("/", protect, (req, res) => chatController.createChat(req, res));

/**
 * @desc    Get chat by scrim ID
 * @route   GET /api/chats/scrim/:scrimId
 * @access  Private
 */
router.get("/scrim/:scrimId", protect, (req, res) =>
  chatController.getChatByScrimId(req, res)
);

/**
 * @desc    Get specific chat by ID
 * @route   GET /api/chats/:chatId
 * @access  Private
 */
router.get("/:chatId", protect, (req, res) =>
  chatController.getChatById(req, res)
);

/**
 * @desc    Send a message to a chat
 * @route   POST /api/chats/:chatId/messages
 * @access  Private
 * @body    { text: "message" }
 */
router.post("/:chatId/messages", protect, (req, res) =>
  chatController.sendMessage(req, res)
);

console.log("✅ chatRoutes setup complete");
module.exports = router;