const mongoose = require("mongoose");
const Scrim = require("../models/Scrim");
const Team = require("../models/Team");
const Game = require("../models/Game");
const Notification = require("../models/Notification");
const Chat = require("../models/Chat");
const eventService = require("../services/eventService");

// Helper Functions
const validateObjectId = (id, fieldName = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
};

const checkTeamPermission = (team, userId) => {
  const isOwner = team.owner.toString() === userId;
  const isManager = team.members.some(
    (m) => m.user.toString() === userId && m.role === "manager"
  );
  return { isOwner, isManager, hasPermission: isOwner || isManager };
};

// Controller Methods
exports.listScrims = async (req, res) => {
  try {
    const { game, server, rank, status } = req.query;

    const filter = {};

    if (game) {
      const gameDoc = await Game.findOne({ name: game }).select("_id");
      if (gameDoc) {
        filter.game = gameDoc._id;
      } else {
        return res.json({
          success: true,
          data: [],
          count: 0,
          message: "No scrims found for the specified game",
        });
      }
    }

    if (status) {
      filter.status = status;
    }

    console.log("Scrim filters applied:", filter);

    let scrims = await Scrim.find(filter)
      .populate("teamA", "name logo game rank server")
      .populate("teamB", "name logo game rank server")
      .populate("game", "name")
      .populate("requests", "name logo")
      .sort({ createdAt: -1 });

    if (server || rank) {
      scrims = scrims.filter((scrim) => {
        let matchesServer = true;
        let matchesRank = true;

        if (server) {
          matchesServer =
            scrim.teamA?.server === server ||
            (scrim.teamB && scrim.teamB.server === server);
        }

        if (rank) {
          matchesRank =
            scrim.teamA?.rank === rank ||
            (scrim.teamB && scrim.teamB.rank === rank);
        }

        return matchesServer && matchesRank;
      });
    }

    console.log(`Found ${scrims.length} scrims after filtering`);

    res.json({
      success: true,
      data: scrims,
      count: scrims.length,
      filters: { game, server, rank, status },
    });
  } catch (error) {
    console.error("List scrims Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
      }),
    });
  }
};

exports.createScrim = async (req, res) => {
  try {
    const { teamId, format, scheduledTime } = req.body;

    if (!teamId || !format || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: "Please provide teamId, format, and scheduledTime",
      });
    }

    validateObjectId(teamId, "team ID");

    const team = await Team.findById(teamId).populate("game", "formats name");
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    const { hasPermission } = checkTeamPermission(team, req.user.userId);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to create scrim for this team",
      });
    }

    let gameDoc = team.game;
    if (!gameDoc) {
      if (mongoose.Types.ObjectId.isValid(team.game)) {
        gameDoc = await Game.findById(team.game).select("formats name");
      } else {
        gameDoc = await Game.findOne({ name: team.game }).select(
          "formats name"
        );
      }
    }

    if (!gameDoc) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    if (!gameDoc.formats.includes(format)) {
      return res.status(400).json({
        success: false,
        message: `Invalid format for ${
          gameDoc.name
        }. Available formats: ${gameDoc.formats.join(", ")}`,
      });
    }

    const scheduledDate = new Date(scheduledTime);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Scheduled time must be in the future",
      });
    }

    const scrim = await Scrim.create({
      teamA: team._id,
      game: gameDoc._id,
      format,
      scheduledTime: scheduledDate,
      status: "open",
    });

    const populatedScrim = await Scrim.findById(scrim._id)
      .populate("teamA", "name logo game rank server")
      .populate("game", "name");

    res.status(201).json({
      success: true,
      message: "Scrim created successfully",
      data: populatedScrim,
    });
  } catch (error) {
    console.error("Scrim-create Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during scrim creation",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
      }),
    });
  }
};

exports.requestScrim = async (req, res) => {
  try {
    const { scrimId } = req.params;
    const { teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: "Please provide teamId",
      });
    }

    validateObjectId(scrimId, "scrim ID");
    validateObjectId(teamId, "team ID");

    const scrim = await Scrim.findById(scrimId)
      .populate("teamA", "name")
      .populate("game", "name");
    if (!scrim) {
      return res.status(404).json({
        success: false,
        message: "Scrim not found",
      });
    }

    if (scrim.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "Scrim is not open for requests",
      });
    }

    const requestingTeam = await Team.findById(teamId);
    if (!requestingTeam) {
      return res.status(404).json({
        success: false,
        message: "Requesting team not found",
      });
    }

    const { hasPermission } = checkTeamPermission(
      requestingTeam,
      req.user.userId
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to make requests for this team",
      });
    }

    if (scrim.teamA.toString() === teamId) {
      return res.status(400).json({
        success: false,
        message: "Cannot request your own scrim",
      });
    }

    if (scrim.requests.some((id) => id.toString() === teamId)) {
      return res.status(400).json({
        success: false,
        message: "Scrim request already sent",
      });
    }

    scrim.requests.push(teamId);
    await scrim.save();

    // Emit event for chat creation
    eventService.emitScrimRequestCreated({
      scrimId: scrim._id,
      teamA: scrim.teamA._id,
      teamB: teamId,
      game: scrim.game._id,
    });

    // Find or create notification reference (chat will be created by ChatService)
    let chat = await Chat.findOne({
      type: "scrim",
      "metadata.scrimId": scrim._id,
    });

    const notification = await Notification.create({
      team: scrim.teamA._id,
      scrim: scrim._id,
      chat: chat ? chat._id : null,
      message: `${requestingTeam.name} requested your scrim`,
      type: "request",
      url: `/scrims/${scrim._id}/requests`,
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("newNotification", {
        teamId: scrim.teamA._id,
        notification: notification,
      });
      console.log(
        `Emitted scrim request notification to team ${scrim.teamA._id}`
      );
    }

    const updatedScrim = await Scrim.findById(scrim._id)
      .populate("teamA", "name logo game rank server")
      .populate("teamB", "name logo game rank server")
      .populate("game", "name")
      .populate("requests", "name logo");

    res.json({
      success: true,
      message: "Scrim request sent successfully",
      data: updatedScrim,
    });
  } catch (error) {
    console.error("Scrim-request Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during scrim request",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
      }),
    });
  }
};

exports.getScrim = async (req, res) => {
  try {
    const { scrimId } = req.params;

    validateObjectId(scrimId, "scrim ID");

    const scrim = await Scrim.findById(scrimId)
      .populate("teamA", "name logo owner members game rank server")
      .populate("teamB", "name logo game rank server")
      .populate("game", "name")
      .populate("requests", "name logo");

    if (!scrim) {
      return res.status(404).json({
        success: false,
        message: "Scrim not found",
      });
    }

    const { hasPermission } = checkTeamPermission(scrim.teamA, req.user.userId);
    const payload = scrim.toObject();

    if (!hasPermission) {
      delete payload.requests;
    }

    res.json({
      success: true,
      data: payload,
    });
  } catch (error) {
    console.error("Scrim-fetch Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching scrim",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
      }),
    });
  }
};

exports.updateScrim = async (req, res) => {
  try {
    const { scrimId } = req.params;
    const { format, scheduledTime } = req.body;

    validateObjectId(scrimId, "scrim ID");

    const scrim = await Scrim.findById(scrimId).populate(
      "game",
      "formats name"
    );
    if (!scrim) {
      return res.status(404).json({
        success: false,
        message: "Scrim not found",
      });
    }

    const team = await Team.findById(scrim.teamA);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    const { hasPermission } = checkTeamPermission(team, req.user.userId);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Only the team owner or manager can edit this scrim",
      });
    }

    if (scrim.status === "booked") {
      return res.status(400).json({
        success: false,
        message: "Cannot edit a booked scrim",
      });
    }

    if (format) {
      if (!scrim.game.formats.includes(format)) {
        return res.status(400).json({
          success: false,
          message: `Invalid format for ${
            scrim.game.name
          }. Available formats: ${scrim.game.formats.join(", ")}`,
        });
      }
      scrim.format = format;
    }

    if (scheduledTime) {
      const scheduledDate = new Date(scheduledTime);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: "Scheduled time must be in the future",
        });
      }
      scrim.scheduledTime = scheduledDate;
    }

    const updated = await scrim.save();
    const populatedScrim = await Scrim.findById(updated._id)
      .populate("teamA", "name logo game rank server")
      .populate("teamB", "name logo game rank server")
      .populate("game", "name")
      .populate("requests", "name logo");

    res.json({
      success: true,
      message: "Scrim updated successfully",
      data: populatedScrim,
    });
  } catch (error) {
    console.error("Scrim-update Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating scrim",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
      }),
    });
  }
};

exports.deleteScrim = async (req, res) => {
  try {
    const { scrimId } = req.params;

    validateObjectId(scrimId, "scrim ID");

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) {
      return res.status(404).json({
        success: false,
        message: "Scrim not found",
      });
    }

    const team = await Team.findById(scrim.teamA);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    const { hasPermission } = checkTeamPermission(team, req.user.userId);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Only the team owner or manager can delete this scrim",
      });
    }

    console.log(`Starting cascade delete for scrim ${scrimId}`);

    const chat = await Chat.findOne({
      type: "scrim",
      "metadata.scrimId": scrimId,
    });
    if (chat) {
      console.log(`Deleting chat ${chat._id} for scrim ${scrimId}`);
      await Chat.findByIdAndDelete(chat._id);

      const io = req.app.get("io");
      if (io) {
        io.to(chat._id.toString()).emit("chatDeleted", {
          message: "This scrim has been deleted by the organizer",
        });
      }
    }

    const deletedNotifications = await Notification.deleteMany({
      scrim: scrimId,
    });
    console.log(
      `Deleted ${deletedNotifications.deletedCount} notifications for scrim ${scrimId}`
    );

    await Scrim.findByIdAndDelete(scrimId);
    console.log(`Deleted scrim ${scrimId}`);

    const io = req.app.get("io");
    if (io) {
      const allTeams = [
        scrim.teamA.toString(),
        ...(Array.isArray(scrim.requests)
          ? scrim.requests.map((id) => id.toString())
          : []),
        ...(scrim.teamB ? [scrim.teamB.toString()] : []),
      ];

      allTeams.forEach((teamId) => {
        io.emit("scrimDeleted", {
          teamId: teamId,
          scrimId: scrimId,
          message: `Scrim deleted by ${team.name}`,
        });
      });
    }

    res.json({
      success: true,
      message: "Scrim and related data removed successfully",
      details: {
        scrimDeleted: true,
        chatDeleted: !!chat,
        notificationsDeleted: deletedNotifications.deletedCount,
      },
    });
  } catch (error) {
    console.error("Scrim cascade delete Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting scrim",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
      }),
    });
  }
};

exports.acceptScrim = async (req, res) => {
  try {
    const { scrimId } = req.params;
    const { teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: "Please provide teamId",
      });
    }

    validateObjectId(scrimId, "scrim ID");
    validateObjectId(teamId, "team ID");

    const scrim = await Scrim.findById(scrimId).populate("game", "name");
    if (!scrim) {
      return res.status(404).json({
        success: false,
        message: "Scrim not found",
      });
    }

    if (scrim.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "Scrim is not open for accepting requests",
      });
    }

    const [postingTeam, requestingTeam] = await Promise.all([
      Team.findById(scrim.teamA),
      Team.findById(teamId),
    ]);

    if (!postingTeam || !requestingTeam) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    const { hasPermission } = checkTeamPermission(postingTeam, req.user.userId);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Only the team owner or manager can accept this scrim",
      });
    }

    if (!scrim.requests.includes(teamId)) {
      return res.status(400).json({
        success: false,
        message: "That team did not request this scrim",
      });
    }

    scrim.teamB = teamId;
    scrim.status = "booked";
    scrim.requests = [];
    await scrim.save();

    // Emit event for chat service (if not already created)
    eventService.emitScrimAccepted({
      scrimId: scrim._id,
      teamA: scrim.teamA,
      teamB: teamId,
      game: scrim.game._id,
    });

    let chat = await Chat.findOne({
      type: "scrim",
      "metadata.scrimId": scrim._id,
    });
    if (!chat) {
      // Chat should have been created on request, but create if missing
      console.log(`Chat not found for scrim ${scrim._id}, will be created by ChatService`);
    }

    const [acceptNotification, feedbackNotification] = await Promise.all([
      Notification.create({
        team: teamId,
        scrim: scrim._id,
        chat: chat ? chat._id : null,
        message: `${postingTeam.name} accepted your scrim request`,
        type: "accept",
      }),
      Notification.create({
        team: scrim.teamA,
        scrim: scrim._id,
        chat: chat ? chat._id : null,
        message: `You accepted ${requestingTeam.name}'s request`,
        type: "accept-feedback",
      }),
    ]);

    const io = req.app.get("io");
    if (io) {
      io.emit("newNotification", {
        teamId: teamId,
        notification: acceptNotification,
      });
      io.emit("newNotification", {
        teamId: scrim.teamA,
        notification: feedbackNotification,
      });
      console.log(
        `Emitted accept notifications to teams ${teamId} and ${scrim.teamA}`
      );
    }

    const updatedScrim = await Scrim.findById(scrim._id)
      .populate("teamA", "name logo game rank server")
      .populate("teamB", "name logo game rank server")
      .populate("game", "name");

    res.json({
      success: true,
      message: "Scrim request accepted successfully",
      data: updatedScrim,
    });
  } catch (error) {
    console.error("Scrim-accept Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while accepting scrim",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
      }),
    });
  }
};

exports.declineScrim = async (req, res) => {
  try {
    const { scrimId } = req.params;
    const { teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: "Please provide teamId",
      });
    }

    validateObjectId(scrimId, "scrim ID");
    validateObjectId(teamId, "team ID");

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) {
      return res.status(404).json({
        success: false,
        message: "Scrim not found",
      });
    }

    const [team, requestingTeam] = await Promise.all([
      Team.findById(scrim.teamA),
      Team.findById(teamId),
    ]);

    if (!team || !requestingTeam) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    const { hasPermission } = checkTeamPermission(team, req.user.userId);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Only the team owner or manager can decline this scrim",
      });
    }

    if (!scrim.requests.includes(teamId)) {
      return res.status(400).json({
        success: false,
        message: "That team did not request this scrim",
      });
    }

    scrim.requests = scrim.requests.filter((id) => id.toString() !== teamId);
    await scrim.save();

    let chat = await Chat.findOne({
      type: "scrim",
      "metadata.scrimId": scrim._id,
    });

    const notification = await Notification.create({
      team: teamId,
      scrim: scrim._id,
      chat: chat ? chat._id : null,
      message: `${team.name} declined your scrim request`,
      type: "decline",
      url: "/chats",
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("newNotification", {
        teamId: teamId,
        notification: notification,
      });
      console.log(`Emitted decline notification to team ${teamId}`);
    }

    const updatedScrim = await Scrim.findById(scrim._id)
      .populate("teamA", "name logo game rank server")
      .populate("teamB", "name logo game rank server")
      .populate("game", "name")
      .populate("requests", "name logo");

    res.json({
      success: true,
      message: "Scrim request declined successfully",
      data: updatedScrim,
    });
  } catch (error) {
    console.error("Scrim-decline Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while declining scrim",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
      }),
    });
  }
};