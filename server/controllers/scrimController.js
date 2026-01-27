// server/controllers/scrimController.js
const mongoose = require("mongoose");
const Scrim = require("../models/Scrim");
const Team = require("../models/Team");
const Game = require("../models/Game");
const Notification = require("../models/Notification");
const Chat = require("../models/Chat");
const eventService = require("../services/eventService");

const validateObjectId = (id, fieldName = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
};

const checkTeamPermission = (team, userId) => {
  try {
    const userIdStr = userId ? userId.toString() : null;
    if (!userIdStr) {
      console.log("❌ [PERMISSION] No userId provided");
      return { isOwner: false, isManager: false, hasPermission: false };
    }

    console.log("🔍 [PERMISSION] Checking permissions:");
    console.log("  - User ID:", userIdStr);
    console.log("  - Team ID:", team._id?.toString());
    console.log("  - Team Owner:", team.owner?.toString());
    console.log("  - Team Members:", team.members?.map(m => ({ user: m.user?.toString(), role: m.role })));

    const isOwner = team.owner && team.owner.toString() === userIdStr;
    const isManager = team.members && team.members.some(
      (m) => m.user && m.user.toString() === userIdStr && m.role === "manager"
    );

    console.log("  - Is Owner:", isOwner);
    console.log("  - Is Manager:", isManager);
    console.log("  - Has Permission:", isOwner || isManager);

    return { isOwner, isManager, hasPermission: isOwner || isManager };
  } catch (error) {
    console.error("❌ [PERMISSION] Error in checkTeamPermission:", error);
    return { isOwner: false, isManager: false, hasPermission: false };
  }
};

exports.listScrims = async (req, res) => {
  try {
    console.log("📋 [LIST-SCRIMS] Request received");
    console.log("📋 [LIST-SCRIMS] Query params:", req.query);
    
    const { game, server, rank, status } = req.query;

    const filter = {};

    if (game) {
      console.log("🎮 [LIST-SCRIMS] Filtering by game:", game);
      const gameDoc = await Game.findOne({ name: game }).select("_id");
      if (gameDoc) {
        filter.game = gameDoc._id;
        console.log("✅ [LIST-SCRIMS] Game found:", gameDoc._id);
      } else {
        console.log("⚠️ [LIST-SCRIMS] Game not found:", game);
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
      console.log("📊 [LIST-SCRIMS] Filtering by status:", status);
    }

    console.log("🔍 [LIST-SCRIMS] Database filter:", filter);

    let scrims = await Scrim.find(filter)
      .populate("teamA", "name logo game rank server")
      .populate("teamB", "name logo game rank server")
      .populate("game", "name")
      .populate("requests", "name logo")
      .sort({ createdAt: -1 })
      .lean();

    console.log(`✅ [LIST-SCRIMS] Database query returned ${scrims.length} scrims`);

    if (!scrims || !Array.isArray(scrims)) {
      console.error("❌ [LIST-SCRIMS] Scrims is not an array:", scrims);
      return res.json({
        success: true,
        data: [],
        count: 0,
      });
    }

    if (server || rank) {
      console.log("🔍 [LIST-SCRIMS] Applying server/rank filters:", { server, rank });
      
      scrims = scrims.filter((scrim) => {
        if (!scrim || !scrim.teamA) {
          console.warn("⚠️ [LIST-SCRIMS] Invalid scrim in results:", scrim);
          return false;
        }
        
        let matchesServer = true;
        let matchesRank = true;

        if (server) {
          matchesServer = scrim.teamA.server === server;
        }

        if (rank) {
          matchesRank = scrim.teamA.rank === rank;
        }

        return matchesServer && matchesRank;
      });
      
      console.log(`✅ [LIST-SCRIMS] After filtering: ${scrims.length} scrims`);
    }

    console.log(`✅ [LIST-SCRIMS] Returning ${scrims.length} scrims`);

    res.json({
      success: true,
      data: scrims,
      count: scrims.length,
      filters: { game, server, rank, status },
    });
  } catch (error) {
    console.error("❌ [LIST-SCRIMS] ERROR:", error);
    console.error("❌ [LIST-SCRIMS] ERROR Stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
        stack: error.stack,
      }),
    });
  }
};

exports.createScrim = async (req, res) => {
  let scrimId = null;
  
  try {
    const { teamId, format, scheduledTime } = req.body;
    
    console.log("📝 [CREATE-SCRIM] === START ===");
    console.log("📝 [CREATE-SCRIM] Request body:", req.body);
    console.log("📝 [CREATE-SCRIM] Request user:", req.user);

    // Validation
    if (!teamId || !format || !scheduledTime) {
      console.log("❌ [CREATE-SCRIM] Missing required fields");
      return res.status(400).json({
        success: false,
        message: "Please provide teamId, format, and scheduledTime",
      });
    }

    validateObjectId(teamId, "team ID");

    const userId = req.user.userId || req.user.id;
    console.log("📝 [CREATE-SCRIM] Extracted userId:", userId);

    // Get team
    console.log("📝 [CREATE-SCRIM] Fetching team...");
    const team = await Team.findById(teamId).populate("game", "formats name _id");
    if (!team) {
      console.log("❌ [CREATE-SCRIM] Team not found");
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    console.log("✅ [CREATE-SCRIM] Team found:", { 
      teamId: team._id, 
      owner: team.owner,
      memberCount: team.members?.length 
    });

    // Check permissions
    console.log("📝 [CREATE-SCRIM] Checking permissions...");
    const { hasPermission } = checkTeamPermission(team, userId);
    console.log("📝 [CREATE-SCRIM] Permission check:", hasPermission);
    
    if (!hasPermission) {
      console.log("❌ [CREATE-SCRIM] Permission denied");
      return res.status(403).json({
        success: false,
        message: "Not authorized to create scrim for this team",
      });
    }

    // Get game
    console.log("📝 [CREATE-SCRIM] Fetching game...");
    let gameDoc = team.game;
    console.log("📝 [CREATE-SCRIM] Game from team:", gameDoc);
    
    if (!gameDoc || !gameDoc._id) {
      console.log("📝 [CREATE-SCRIM] Game not populated, fetching...");
      if (mongoose.Types.ObjectId.isValid(team.game)) {
        gameDoc = await Game.findById(team.game).select("formats name _id");
      } else {
        gameDoc = await Game.findOne({ name: team.game }).select("formats name _id");
      }
    }

    if (!gameDoc) {
      console.log("❌ [CREATE-SCRIM] Game not found");
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    console.log("✅ [CREATE-SCRIM] Game doc:", { 
      id: gameDoc._id, 
      name: gameDoc.name, 
      formats: gameDoc.formats 
    });

    // Validate format
    if (!gameDoc.formats || !gameDoc.formats.includes(format)) {
      console.log("❌ [CREATE-SCRIM] Invalid format");
      return res.status(400).json({
        success: false,
        message: `Invalid format for ${gameDoc.name}. Available formats: ${gameDoc.formats?.join(", ") || "none"}`,
      });
    }

    // Validate time
    const scheduledDate = new Date(scheduledTime);
    console.log("📝 [CREATE-SCRIM] Scheduled date:", scheduledDate, "Now:", new Date());
    
    if (scheduledDate <= new Date()) {
      console.log("❌ [CREATE-SCRIM] Time in past");
      return res.status(400).json({
        success: false,
        message: "Scheduled time must be in the future",
      });
    }

    // Create scrim
    const scrimData = {
      teamA: team._id,
      game: gameDoc._id,
      format,
      scheduledTime: scheduledDate,
      status: "open",
    };

    console.log("📝 [CREATE-SCRIM] Creating scrim with data:", scrimData);

    const scrim = await Scrim.create(scrimData);
    scrimId = scrim._id;

    console.log("✅ [CREATE-SCRIM] Scrim created with ID:", scrimId);

    // Populate scrim
    console.log("📝 [CREATE-SCRIM] Populating scrim...");
    let populatedScrim;
    try {
      populatedScrim = await Scrim.findById(scrim._id)
        .populate("teamA", "name logo game rank server")
        .populate("game", "name")
        .lean();
      
      console.log("✅ [CREATE-SCRIM] Scrim populated successfully");
    } catch (populateError) {
      console.error("❌ [CREATE-SCRIM] Populate error:", populateError);
      // Return unpopulated scrim as fallback
      populatedScrim = scrim.toObject();
    }

    // Emit event
    console.log("📝 [CREATE-SCRIM] Emitting event...");
    try {
      eventService.emit("scrim:created", {
        scrimId: scrim._id,
        teamA: team._id,
        game: gameDoc._id,
        format,
        scheduledTime: scheduledDate,
      });
      console.log("✅ [CREATE-SCRIM] Event emitted successfully");
    } catch (eventError) {
      console.error("❌ [CREATE-SCRIM] Event emission error:", eventError);
      // Continue anyway - event emission failure shouldn't block response
    }

    // Send response
    console.log("📝 [CREATE-SCRIM] Sending response...");
    const responseData = {
      success: true,
      message: "Scrim created successfully",
      data: populatedScrim,
    };
    
    console.log("📝 [CREATE-SCRIM] Response data:", JSON.stringify(responseData, null, 2));
    console.log("✅ [CREATE-SCRIM] === SUCCESS ===");
    
    return res.status(201).json(responseData);

  } catch (error) {
    console.error("❌ [CREATE-SCRIM] === ERROR ===");
    console.error("❌ [CREATE-SCRIM] Error:", error);
    console.error("❌ [CREATE-SCRIM] Error stack:", error.stack);
    console.error("❌ [CREATE-SCRIM] Scrim ID:", scrimId);
    
    return res.status(500).json({
      success: false,
      message: "Server error during scrim creation",
      scrimId: scrimId, // Include scrim ID so user knows it was created
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
        stack: error.stack,
      }),
    });
  }
};

exports.requestScrim = async (req, res) => {
  try {
    const { scrimId } = req.params;
    const { teamId } = req.body;
    const userId = req.user.userId || req.user.id;

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

    const { hasPermission } = checkTeamPermission(requestingTeam, userId);
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

    const eventData = {
      scrimId: scrim._id,
      teamA: scrim.teamA._id,
      teamB: teamId,
      game: scrim.game._id,
    };
    console.log("📨 [SCRIM-CONTROLLER] Emitting scrim request event:", JSON.stringify(eventData, null, 2));
    eventService.emitScrimRequestCreated(eventData);

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
      const teamRoom = `team:${scrim.teamA._id}`;
      io.to(teamRoom).emit("newNotification", {
        teamId: scrim.teamA._id,
        notification: notification,
      });
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
    const userId = req.user.userId || req.user.id;

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

    const { hasPermission } = checkTeamPermission(scrim.teamA, userId);
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
    const userId = req.user.userId || req.user.id;

    validateObjectId(scrimId, "scrim ID");

    const scrim = await Scrim.findById(scrimId).populate("game", "formats name");
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

    const { hasPermission } = checkTeamPermission(team, userId);
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
          message: `Invalid format for ${scrim.game.name}. Available formats: ${scrim.game.formats.join(", ")}`,
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

    eventService.emit("scrim:updated", {
      scrimId: scrim._id,
      teamA: scrim.teamA,
      teamB: scrim.teamB,
      changes: { format, scheduledTime },
    });

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
    const userId = req.user.userId || req.user.id;

    console.log("🗑️ [DELETE-SCRIM] Delete request received");
    console.log("  - Scrim ID:", scrimId);
    console.log("  - User ID:", userId);

    validateObjectId(scrimId, "scrim ID");

    const scrim = await Scrim.findById(scrimId);
    if (!scrim) {
      return res.status(404).json({
        success: false,
        message: "Scrim not found",
      });
    }

    console.log("🔍 [DELETE-SCRIM] Scrim found:", scrimId);
    console.log("  - TeamA ID:", scrim.teamA?.toString());

    const team = await Team.findById(scrim.teamA);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    console.log("✅ [DELETE-SCRIM] Team loaded, checking permissions...");

    const { hasPermission } = checkTeamPermission(team, userId);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Only the team owner or manager can delete this scrim",
      });
    }

    const chat = await Chat.findOne({
      type: "scrim",
      "metadata.scrimId": scrimId,
    });
    
    if (chat) {
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

    await Scrim.findByIdAndDelete(scrimId);

    eventService.emitScrimCancelled({
      scrimId: scrimId,
      teamA: scrim.teamA,
      teamB: scrim.teamB,
      deletedBy: userId,
    });

    const io = req.app.get("io");
    if (io) {
      const allTeams = [
        scrim.teamA.toString(),
        ...(Array.isArray(scrim.requests) ? scrim.requests.map((id) => id.toString()) : []),
        ...(scrim.teamB ? [scrim.teamB.toString()] : []),
      ];

      allTeams.forEach((teamId) => {
        const teamRoom = `team:${teamId}`;
        io.to(teamRoom).emit("scrimDeleted", {
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
    const userId = req.user.userId || req.user.id;

    console.log("✅ [ACCEPT-SCRIM] Starting acceptance");

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

    const { hasPermission } = checkTeamPermission(postingTeam, userId);
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

    // Update scrim status
    scrim.teamB = teamId;
    scrim.status = "booked";
    scrim.requests = [];
    await scrim.save();

    console.log("✅ [ACCEPT-SCRIM] Scrim updated to booked");

    // ✅ FIXED: Get existing chat (created when request was made)
    const Chat = require("../models/Chat");
    const chat = await Chat.findOne({
      type: "scrim",
      "metadata.scrimId": scrim._id,
    });

    const chatId = chat ? chat._id.toString() : null;
    console.log("✅ [ACCEPT-SCRIM] Chat found:", chatId);

    // Emit acceptance event (chatService will update chat metadata)
    eventService.emitScrimAccepted({
      scrimId: scrim._id,
      teamA: scrim.teamA,
      teamB: teamId,
      game: scrim.game._id,
      chatId: chatId,
    });

    // Create notifications
    const [acceptNotification, feedbackNotification] = await Promise.all([
      Notification.create({
        team: teamId,
        scrim: scrim._id,
        chat: chat ? chat._id : null,
        message: `${postingTeam.name} accepted your scrim request`,
        type: "accept",
        url: chatId ? `/chats/${chatId}` : `/scrims/${scrim._id}`,
      }),
      Notification.create({
        team: scrim.teamA,
        scrim: scrim._id,
        chat: chat ? chat._id : null,
        message: `You accepted ${requestingTeam.name}'s request`,
        type: "accept-feedback",
        url: chatId ? `/chats/${chatId}` : `/scrims/${scrim._id}`,
      }),
    ]);

    // Emit notifications via Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.to(`team:${teamId}`).emit("newNotification", {
        teamId: teamId,
        notification: acceptNotification,
      });
      io.to(`team:${scrim.teamA}`).emit("newNotification", {
        teamId: scrim.teamA,
        notification: feedbackNotification,
      });
    }

    const updatedScrim = await Scrim.findById(scrim._id)
      .populate("teamA", "name logo game rank server")
      .populate("teamB", "name logo game rank server")
      .populate("game", "name");

    console.log("✅ [ACCEPT-SCRIM] Acceptance complete");

    res.json({
      success: true,
      message: "Scrim request accepted successfully",
      data: updatedScrim,
      chatId: chatId, // Always return chatId for frontend navigation
    });
  } catch (error) {
    console.error("❌ [ACCEPT-SCRIM] Error:", error);
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
    const userId = req.user.userId || req.user.id;

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

    const { hasPermission } = checkTeamPermission(team, userId);
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

    eventService.emit("scrim:declined", {
      scrimId: scrim._id,
      teamA: scrim.teamA,
      teamB: teamId,
      declinedBy: userId,
    });

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
      url: "/scrims",
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`team:${teamId}`).emit("newNotification", {
        teamId: teamId,
        notification: notification,
      });
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

exports.completeScrim = async (req, res) => {
  try {
    const { scrimId } = req.params;
    const { winner, score } = req.body;
    const userId = req.user.userId || req.user.id;

    validateObjectId(scrimId, "scrim ID");

    const scrim = await Scrim.findById(scrimId)
      .populate("teamA", "name")
      .populate("teamB", "name");

    if (!scrim) {
      return res.status(404).json({
        success: false,
        message: "Scrim not found",
      });
    }

    if (scrim.status !== "booked") {
      return res.status(400).json({
        success: false,
        message: "Only booked scrims can be marked as completed",
      });
    }

    const [teamA, teamB] = await Promise.all([
      Team.findById(scrim.teamA._id),
      Team.findById(scrim.teamB._id),
    ]);

    const hasTeamAPermission = checkTeamPermission(teamA, userId).hasPermission;
    const hasTeamBPermission = checkTeamPermission(teamB, userId).hasPermission;

    if (!hasTeamAPermission && !hasTeamBPermission) {
      return res.status(403).json({
        success: false,
        message: "Only team owners or managers can mark scrim as completed",
      });
    }

    scrim.status = "completed";
    if (winner) scrim.winner = winner;
    if (score) scrim.score = score;
    await scrim.save();

    eventService.emitScrimCompleted({
      scrimId: scrim._id,
      teamA: scrim.teamA._id,
      teamB: scrim.teamB._id,
      winner: winner,
      score: score,
      completedBy: userId,
    });

    const populatedScrim = await Scrim.findById(scrim._id)
      .populate("teamA", "name logo game rank server")
      .populate("teamB", "name logo game rank server")
      .populate("game", "name");

    res.json({
      success: true,
      message: "Scrim marked as completed",
      data: populatedScrim,
    });
  } catch (error) {
    console.error("Complete scrim Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while completing scrim",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
      }),
    });
  }
};