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
    const { unreadOnly, limit = 50, skip = 0 } = req.query;
    
    // 1. Find teams where the user is owner or member
    const teams = await Team.find({
      $or: [{ owner: req.user.userId }, { "members.user": req.user.userId }],
    }).select("_id");
    
    const teamIds = teams.map((t) => t._id);

    // 2. Build query based on filters
    const query = {
      team: { $in: teamIds },
    };
    
    // Apply unreadOnly filter if requested
    if (unreadOnly === "true") {
      query.read = false;
    }

    // 3. Fetch notifications
    const notifications = await Notification.find(query)
      .sort({ read: 1, createdAt: -1 }) // Unread first, then by newest
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate("chat", "_id")
      .populate("team", "name logo")
      .populate("scrim", "game status")
      .lean();

    console.log(
      `📬 GET /api/notifications → ${notifications.length} notifications for teams`,
      teamIds
    );

    // Separate unread and read for logging and response
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
 * @desc    Get unread notification count only
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
router.get("/unread-count", protect, async (req, res) => {
  try {
    // Find teams where the user is owner or member
    const teams = await Team.find({
      $or: [{ owner: req.user.userId }, { "members.user": req.user.userId }],
    }).select("_id");
    
    const teamIds = teams.map((t) => t._id);

    // Count unread notifications
    const unreadCount = await Notification.countDocuments({
      team: { $in: teamIds },
      read: false,
    });

    console.log(`📬 GET /api/notifications/unread-count → ${unreadCount} unread`);

    return res.json({
      success: true,
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
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
      data: notification,
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

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
router.delete("/:id", protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Only delete if it belongs to one of the user's teams
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

    await Notification.findByIdAndDelete(req.params.id);

    console.log(`📬 DELETE /api/notifications/${req.params.id} → deleted`);
    
    return res.json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
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
 * @desc    Delete all read notifications for user's teams
 * @route   DELETE /api/notifications/read
 * @access  Private
 */
router.delete("/read/all", protect, async (req, res) => {
  try {
    // Find all teams the user belongs to
    const teams = await Team.find({
      $or: [{ owner: req.user.userId }, { "members.user": req.user.userId }],
    }).select("_id");
    
    const teamIds = teams.map((t) => t._id);

    // Delete all read notifications for these teams
    const result = await Notification.deleteMany({
      team: { $in: teamIds },
      read: true,
    });

    console.log(`📬 Deleted ${result.deletedCount} read notifications`);

    return res.json({
      success: true,
      message: `${result.deletedCount} read notifications deleted`,
      count: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting read notifications:", error);
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
 * @desc    Mark multiple notifications as read
 * @route   PUT /api/notifications/batch/read
 * @access  Private
 */
router.put("/batch/read", protect, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "notificationIds array is required",
      });
    }

    // Find all teams the user belongs to
    const teams = await Team.find({
      $or: [{ owner: req.user.userId }, { "members.user": req.user.userId }],
    }).select("_id");
    
    const teamIds = teams.map((t) => t._id);

    // Update only notifications that belong to user's teams
    const result = await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        team: { $in: teamIds },
        read: false,
      },
      { read: true }
    );

    console.log(`📬 Batch marked ${result.modifiedCount} notifications as read`);

    return res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error batch marking notifications:", error);
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