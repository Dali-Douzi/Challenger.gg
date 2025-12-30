const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

// Specific routes BEFORE parameterized routes
router.get("/scrim/:scrimId", chatController.getChatByScrimId);

// Parameterized routes
router.get("/", chatController.getUserChats);
router.get("/:chatId", chatController.getChatById);
router.post("/:chatId/messages", chatController.sendMessage);
router.put("/:chatId/read", chatController.markAsRead);
router.delete("/:chatId", chatController.deleteChat);

module.exports = router;