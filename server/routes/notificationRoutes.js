const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

// Specific routes BEFORE parameterized routes
router.put("/mark-all-read", notificationController.markAllAsRead);
router.delete("/read", notificationController.deleteAllRead);
router.get("/count", notificationController.getUnreadCount);

// Parameterized routes
router.get("/", notificationController.getNotifications);
router.put("/:id/read", notificationController.markAsRead);
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;