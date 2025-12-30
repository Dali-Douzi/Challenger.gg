const Notification = require("../models/Notification");
const Team = require("../models/Team");

/**
 * Get notifications for user's teams
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { unreadOnly } = req.query;

    // Get all teams where user is a member
    const userTeams = await Team.find({
      $or: [{ owner: userId }, { "members.user": userId }],
    }).select("_id");

    const teamIds = userTeams.map((t) => t._id);

    // Build query
    const query = { team: { $in: teamIds } };
    if (unreadOnly === "true") {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate("team", "name logo")
      .populate("scrim", "format scheduledTime")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({
      team: { $in: teamIds },
      isRead: false,
    });

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      count: notifications.length,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
      }),
    });
  }
};

/**
 * Mark notification as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Verify user has access to this notification
    const team = await Team.findById(notification.team);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    const isMember =
      team.owner.toString() === userId.toString() ||
      team.members.some((m) => m.user.toString() === userId.toString());

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this notification",
      });
    }

    notification.isRead = true;
    await notification.save();

    res.json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({
      success: false,
      message: "Error marking notification as read",
      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
      }),
    });
  }
};

/**
 * Mark all notifications as read for user's teams
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    // Get all teams where user is a member
    const userTeams = await Team.find({
      $or: [{ owner: userId }, { "members.user": userId }],
    }).select("_id");

    const teamIds = userTeams.map((t) => t._id);

    const result = await Notification.updateMany(
      {
        team: { $in: teamIds },
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    res.json({
      success: true,
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    res.status(500).json({
      success: false,
      message: "Error marking all notifications as read",
      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
      }),
    });
  }
};

/**
 * Delete notification
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Verify user has access to this notification
    const team = await Team.findById(notification.team);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    const isMember =
      team.owner.toString() === userId.toString() ||
      team.members.some((m) => m.user.toString() === userId.toString());

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this notification",
      });
    }

    await Notification.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting notification",
      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
      }),
    });
  }
};

/**
 * Delete all read notifications for user's teams
 */
exports.deleteAllRead = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    // Get all teams where user is a member
    const userTeams = await Team.find({
      $or: [{ owner: userId }, { "members.user": userId }],
    }).select("_id");

    const teamIds = userTeams.map((t) => t._id);

    const result = await Notification.deleteMany({
      team: { $in: teamIds },
      isRead: true,
    });

    res.json({
      success: true,
      message: "Read notifications deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Delete all read notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting read notifications",
      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
      }),
    });
  }
};

/**
 * Get unread notification count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    // Get all teams where user is a member
    const userTeams = await Team.find({
      $or: [{ owner: userId }, { "members.user": userId }],
    }).select("_id");

    const teamIds = userTeams.map((t) => t._id);

    const unreadCount = await Notification.countDocuments({
      team: { $in: teamIds },
      isRead: false,
    });

    res.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({
      success: false,
      message: "Error getting unread count",
      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
      }),
    });
  }
};