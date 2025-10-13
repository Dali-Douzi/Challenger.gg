const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const Notification = require("../models/Notification");
const Team = require("../models/Team");

/**
 * @desc    Get notifications for teams the user owns or manages
 * @route   GET /api/notifications
 * @access  Private
 */
router.get("/", protect, async (req, res) => {
  try {
    // 1. Find teams where the user is owner or member
    const teams = await Team.find({
      $or: [{ owner: req.user.userId }, { "members.user": req.user.userId }],
    }).select("_id");
    
    const teamIds = teams.map((t) => t._id);

    // 2. Fetch ALL notifications for those teams (not just unread)
    const notifications = await Notification.find({
      team: { $in: teamIds },
    })
      .sort({ read: 1, createdAt: -1 }) // Unread first, then by newest
      .limit(50) // Reasonable limit
      .populate("chat", "_id")
      .lean();

    console.log(
      `📬 GET /api/notifications → ${notifications.length} notifications for teams`,
      teamIds
    );

    // Separate unread and read for logging
    const unreadCount = notifications.filter((n) => !n.read).length;
    const readCount = notifications.filter((n) => n.read).length;
    console.log(
      `📬 Returning ${unreadCount} unread, ${readCount} read notifications`
    );

    return res.json({
      success: true,
      data: notifications,
      count: notifications.length,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
      }),
    });
  }
});

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
router.put("/:id/read", protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Only mark if it belongs to one of the user's teams
    const isRelated = await Team.exists({
      _id: notification.team,
      $or: [
        { owner: req.user.userId },
        { "members.user": req.user.userId },
      ],
    });
    
    if (!isRelated) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    notification.read = true;
    await notification.save();

    console.log(
      `📬 PUT /api/notifications/${req.params.id}/read → marked read`
    );
    
    return res.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
      }),
    });
  }
});

/**
 * @desc    Mark all notifications as read for user's teams
 * @route   PUT /api/notifications/mark-all-read
 * @access  Private
 */
router.put("/mark-all-read", protect, async (req, res) => {
  try {
    // Find all teams the user belongs to
    const teams = await Team.find({
      $or: [{ owner: req.user.userId }, { "members.user": req.user.userId }],
    }).select("_id");
    
    const teamIds = teams.map((t) => t._id);

    // Update all unread notifications for these teams
    const result = await Notification.updateMany(
      { team: { $in: teamIds }, read: false },
      { read: true }
    );

    console.log(`📬 Marked ${result.modifiedCount} notifications as read`);

    return res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
      }),
    });
  }
});

module.exports = router;