const Notification = require("../models/Notification");
const Team = require("../models/Team");

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { unreadOnly } = req.query;

    const userTeams = await Team.find({
      $or: [{ owner: userId }, { "members.user": userId }],
    }).select("_id");

    const teamIds = userTeams.map((t) => t._id);

    const query = {
      $or: [
        { team: { $in: teamIds } },
        { user: userId },
      ],
    };
    if (unreadOnly === "true") {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .populate("team", "name logo")
      .populate("scrim", "format scheduledTime")
      .populate("tournament", "name")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({
      $or: [
        { team: { $in: teamIds }, read: false },
        { user: userId, read: false },
      ],
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

    if (notification.user) {
      if (notification.user.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this notification",
        });
      }
    } else if (notification.team) {
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
    }

    notification.read = true;
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

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const userTeams = await Team.find({
      $or: [{ owner: userId }, { "members.user": userId }],
    }).select("_id");

    const teamIds = userTeams.map((t) => t._id);

    const result = await Notification.updateMany(
      {
        $or: [
          { team: { $in: teamIds }, read: false },
          { user: userId, read: false },
        ],
      },
      {
        $set: { read: true },
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

    if (notification.user) {
      if (notification.user.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to delete this notification",
        });
      }
    } else if (notification.team) {
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

exports.deleteAllRead = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const userTeams = await Team.find({
      $or: [{ owner: userId }, { "members.user": userId }],
    }).select("_id");

    const teamIds = userTeams.map((t) => t._id);

    const result = await Notification.deleteMany({
      $or: [
        { team: { $in: teamIds }, read: true },
        { user: userId, read: true },
      ],
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

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const userTeams = await Team.find({
      $or: [{ owner: userId }, { "members.user": userId }],
    }).select("_id");

    const teamIds = userTeams.map((t) => t._id);

    const unreadCount = await Notification.countDocuments({
      $or: [
        { team: { $in: teamIds }, read: false },
        { user: userId, read: false },
      ],
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
