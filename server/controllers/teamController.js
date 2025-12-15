const cloudinary = require("cloudinary").v2;
const Team = require("../models/Team");
const User = require("../models/User");
const Game = require("../models/Game");
const Scrim = require("../models/Scrim");
const Notification = require("../models/Notification");
const Chat = require("../models/Chat");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const deleteOldLogo = async (logoUrl) => {
  try {
    if (logoUrl && logoUrl.includes("cloudinary")) {
      const publicId = logoUrl.split("/").pop().split(".")[0];
      const fullPublicId = `challenger/team-logos/${publicId}`;

      const result = await cloudinary.uploader.destroy(fullPublicId);
      console.log(
        `Deleted old team logo from Cloudinary: ${fullPublicId}`,
        result
      );
    }
  } catch (error) {
    console.error("Error deleting old team logo from Cloudinary:", error);
  }
};

const generateTeamCode = () => {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
};

exports.getGames = async (req, res) => {
  try {
    console.log("🎮 Fetching games from database...");
    res.set({
      "Cache-Control": "public, max-age=300",
      ETag: `"games-${Date.now()}"`,
    });

    const games = await Game.find({}).lean();
    console.log("🎮 Games found:", games.length);

    res.json({
      success: true,
      data: games,
      count: games.length
    });
  } catch (error) {
    console.error("❌ Error fetching games:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching games",
      ...(process.env.NODE_ENV === "development" && {
        error: error.message,
      }),
    });
  }
};

exports.getMyTeams = async (req, res) => {
  try {
    console.log("🔍 [TEAMS] getMyTeams called");
    console.log("🔍 [TEAMS] req.user:", req.user);
    
    const userId = req.user.userId || req.user.id;
    
    if (!userId) {
      console.error("❌ [TEAMS] No user ID found in request");
      return res.status(401).json({
        success: false,
        message: "User ID not found in request"
      });
    }
    
    console.log("✅ [TEAMS] Resolved userId:", userId);
    
    const teams = await Team.find({
      $or: [
        { owner: userId },
        { "members.user": userId }
      ]
    })
      .populate("owner", "username email avatar")
      .populate("members.user", "username email avatar")
      .populate("game", "name formats servers ranks")
      .sort({ createdAt: -1 });

    console.log("✅ [TEAMS] Found teams:", teams.length);
    
    res.status(200).json({
      success: true,
      data: teams,
      count: teams.length
    });
  } catch (error) {
    console.error("❌ [TEAMS] Error fetching user teams:", error);
    console.error("❌ [TEAMS] Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Error fetching user teams",
      error: error.message
    });
  }
};

exports.createTeam = async (req, res) => {
  try {
    const { name, game, rank, server, description } = req.body;
    const userId = req.user.userId || req.user.id;

    console.log("🔍 [CREATE-TEAM] Request data:", { name, game, rank, server, userId });

    if (!name || !game || !rank || !server) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, game, rank, and server",
      });
    }

    const gameDoc = await Game.findOne({ name: game });
    if (!gameDoc) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    const teamCode = generateTeamCode();
    const newTeamData = {
      name,
      game: gameDoc._id,
      rank,
      server,
      description: description || "",
      owner: userId,
      members: [{ user: userId, role: "owner", rank }],
      teamCode: teamCode,
      logo: req.file ? req.file.path : "",
    };

    console.log("🔍 [CREATE-TEAM] Creating team with data:", newTeamData);

    const newTeam = new Team(newTeamData);
    await newTeam.save();

    const ownerUser = await User.findById(userId);
    if (ownerUser) {
      ownerUser.teams.push(newTeam._id);
      await ownerUser.save();
    }

    const populatedTeam = await Team.findById(newTeam._id)
      .populate("members.user", "username email avatar")
      .populate("game", "name");

    console.log("✅ [CREATE-TEAM] Team created:", populatedTeam.name);

    res.status(201).json({
      success: true,
      team: populatedTeam,
    });
  } catch (error) {
    console.error("❌ [CREATE-TEAM] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating team",
      error: error.message
    });
  }
};

exports.joinTeamByCode = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { teamCode } = req.body;

    console.log("🔍 [JOIN-TEAM] Join request:", { userId, teamCode });

    if (!teamCode) {
      return res.status(400).json({
        success: false,
        message: "Team code is required",
      });
    }

    const team = await Team.findOne({ teamCode: teamCode.toUpperCase() });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Invalid team code",
      });
    }

    if (team.members.some((m) => m.user.toString() === userId)) {
      return res.status(400).json({
        success: false,
        message: "Already a member of this team",
      });
    }

    team.members.push({ user: userId, role: "player", rank: team.rank });
    await team.save();

    const memberUser = await User.findById(userId);
    if (memberUser) {
      memberUser.teams.push(team._id);
      await memberUser.save();
    }

    const updatedTeam = await Team.findById(team._id)
      .populate("members.user", "username email avatar")
      .populate("game", "name");

    console.log("✅ [JOIN-TEAM] User joined team:", updatedTeam.name);

    res.status(200).json({
      success: true,
      message: "Joined team successfully",
      team: updatedTeam,
    });
  } catch (error) {
    console.error("❌ [JOIN-TEAM] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error joining team",
      error: error.message
    });
  }
};

exports.getTeamById = async (req, res) => {
  try {
    const teamId = req.params.id;
    
    console.log("🔍 [GET-TEAM] Fetching team:", teamId);
    
    const team = await Team.findById(teamId)
      .populate("members.user", "username email avatar")
      .populate("game", "name ranks servers");

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    const gameDoc = await Game.findById(team.game._id || team.game);
    const availableRanks = gameDoc ? gameDoc.ranks : [];

    console.log("✅ [GET-TEAM] Team found:", team.name, "Ranks:", availableRanks.length);

    const teamResponse = {
      ...team.toObject(),
      availableRanks
    };

    res.status(200).json(teamResponse);
  } catch (error) {
    console.error("❌ [GET-TEAM] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching team",
      error: error.message
    });
  }
};

exports.updateTeam = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.userId || req.user.id;
    const { name, game, rank, server, description } = req.body;

    console.log("🔍 [UPDATE-TEAM] Update request:", { teamId, userId, changes: { name, game, rank, server } });

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    if (team.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (name) team.name = name;
    if (game) {
      const gameDoc = await Game.findOne({ name: game });
      if (!gameDoc) {
        return res.status(404).json({
          success: false,
          message: "Game not found",
        });
      }
      team.game = gameDoc._id;
    }
    if (rank) team.rank = rank;
    if (server) team.server = server;
    if (description !== undefined) team.description = description;

    if (req.file) {
      if (team.logo) {
        await deleteOldLogo(team.logo);
      }
      team.logo = req.file.path;
    }

    await team.save();

    const updatedTeam = await Team.findById(teamId)
      .populate("members.user", "username email avatar")
      .populate("game", "name");

    console.log("✅ [UPDATE-TEAM] Team updated:", updatedTeam.name);

    res.status(200).json({
      success: true,
      team: updatedTeam,
    });
  } catch (error) {
    console.error("❌ [UPDATE-TEAM] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating team",
      error: error.message
    });
  }
};

exports.updateTeamLogo = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.userId || req.user.id;

    console.log("🔍 [UPDATE-LOGO] Request:", { teamId, userId });

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    if (team.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No logo file provided",
      });
    }

    if (team.logo) {
      await deleteOldLogo(team.logo);
    }

    team.logo = req.file.path;
    await team.save();

    const updatedTeam = await Team.findById(teamId)
      .populate("members.user", "username email avatar")
      .populate("game", "name");

    console.log("✅ [UPDATE-LOGO] Logo updated for team:", updatedTeam.name);

    res.status(200).json({
      success: true,
      team: updatedTeam,
    });
  } catch (error) {
    console.error("❌ [UPDATE-LOGO] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating logo",
      error: error.message
    });
  }
};

exports.deleteTeamLogo = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.userId || req.user.id;

    console.log("🔍 [DELETE-LOGO] Request:", { teamId, userId });

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    if (team.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (team.logo) {
      await deleteOldLogo(team.logo);
      team.logo = "";
      await team.save();
    }

    const updatedTeam = await Team.findById(teamId)
      .populate("members.user", "username email avatar")
      .populate("game", "name");

    console.log("✅ [DELETE-LOGO] Logo deleted for team:", updatedTeam.name);

    res.status(200).json({
      success: true,
      team: updatedTeam,
    });
  } catch (error) {
    console.error("❌ [DELETE-LOGO] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting logo",
      error: error.message
    });
  }
};

exports.joinTeamById = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.userId || req.user.id;
    const { code } = req.body;

    console.log("🔍 [JOIN-BY-ID] Request:", { teamId, userId, code });

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    if (team.teamCode !== code) {
      return res.status(401).json({
        success: false,
        message: "Invalid code",
      });
    }

    if (team.members.some((m) => m.user.toString() === userId)) {
      return res.status(400).json({
        success: false,
        message: "Already a member",
      });
    }

    team.members.push({ user: userId, role: "player", rank: team.rank });
    await team.save();

    const memberUser = await User.findById(userId);
    if (memberUser) {
      memberUser.teams.push(teamId);
      await memberUser.save();
    }

    const updatedTeam = await Team.findById(teamId)
      .populate("members.user", "username email avatar")
      .populate("game", "name");

    console.log("✅ [JOIN-BY-ID] User joined team:", updatedTeam.name);

    res.status(200).json({
      success: true,
      message: "Joined team",
      team: updatedTeam,
    });
  } catch (error) {
    console.error("❌ [JOIN-BY-ID] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error joining team",
      error: error.message
    });
  }
};

exports.deleteTeam = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.userId || req.user.id;

    console.log("🔍 [DELETE-TEAM] Request:", { teamId, userId });

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    if (team.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    console.log(`🗑️ [DELETE-TEAM] Team deletion initiated: ${team.name} by user ${userId}`);

    if (team.logo) {
      await deleteOldLogo(team.logo);
    }

    for (const member of team.members) {
      const memberUser = await User.findById(member.user);
      if (memberUser) {
        memberUser.teams = memberUser.teams.filter(
          (tId) => tId.toString() !== teamId
        );
        await memberUser.save();
      }
    }

    await Team.findByIdAndDelete(teamId);

    console.log(`✅ [DELETE-TEAM] Team deleted: ${team.name}`);

    try {
      console.log("🧹 [DELETE-TEAM] Cleaning scrims where deleted team was posting team...");

      const orphanedScrims = await Scrim.find({ teamA: teamId });
      let cleanedScrims = 0;

      for (const scrim of orphanedScrims) {
        await Chat.deleteMany({
          type: "scrim",
          "metadata.scrimId": scrim._id,
        });
        await Notification.deleteMany({ scrim: scrim._id });

        const io = req.app.get("io");
        if (io) {
          const allTeams = [
            ...(Array.isArray(scrim.requests)
              ? scrim.requests.map((id) => id.toString())
              : []),
            ...(scrim.teamB ? [scrim.teamB.toString()] : []),
          ];

          allTeams.forEach((notifyTeamId) => {
            io.emit("scrimDeleted", {
              teamId: notifyTeamId,
              scrimId: scrim._id,
              message: `Scrim deleted because ${team.name} was deleted`,
            });
          });
        }

        await Scrim.findByIdAndDelete(scrim._id);
        cleanedScrims++;
        console.log(`🧹 [DELETE-TEAM] Cleaned orphaned scrim: ${scrim._id}`);
      }

      const updatedScrims = await Scrim.updateMany(
        { requests: teamId },
        { $pull: { requests: teamId } }
      );

      console.log(
        `✅ [DELETE-TEAM] Cleanup completed: ${cleanedScrims} scrims removed, ${updatedScrims.modifiedCount} scrims updated`
      );
    } catch (cleanupError) {
      console.error("⚠️ [DELETE-TEAM] Cleanup failed:", cleanupError);
    }

    res.status(200).json({
      success: true,
      message: "Team deleted successfully",
    });
  } catch (error) {
    console.error("❌ [DELETE-TEAM] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting team",
      error: error.message
    });
  }
};

exports.updateMemberRole = async (req, res) => {
  try {
    const { teamId, memberId } = req.params;
    const { role } = req.body;
    const userId = req.user.userId || req.user.id;

    console.log("🔍 [UPDATE-ROLE] Request:", { teamId, memberId, role, userId });

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    if (team.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const target = team.members.id(memberId);
    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    target.role = role;
    await team.save();

    const updatedTeam = await Team.findById(teamId)
      .populate("members.user", "username email avatar")
      .populate("game", "name");

    console.log("✅ [UPDATE-ROLE] Role updated for member in team:", updatedTeam.name);

    res.status(200).json({
      success: true,
      team: updatedTeam,
    });
  } catch (error) {
    console.error("❌ [UPDATE-ROLE] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating role",
      error: error.message
    });
  }
};

exports.updateMemberRank = async (req, res) => {
  try {
    const { teamId, memberId } = req.params;
    const { rank } = req.body;
    const userId = req.user.userId || req.user.id;

    console.log("🔍 [UPDATE-RANK] Request:", { teamId, memberId, rank, userId });

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    if (team.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const target = team.members.id(memberId);
    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    target.rank = rank;
    await team.save();

    const updatedTeam = await Team.findById(teamId)
      .populate("members.user", "username email avatar")
      .populate("game", "name");

    console.log("✅ [UPDATE-RANK] Rank updated for member in team:", updatedTeam.name);

    res.status(200).json({
      success: true,
      team: updatedTeam,
    });
  } catch (error) {
    console.error("❌ [UPDATE-RANK] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating rank",
      error: error.message
    });
  }
};

exports.leaveTeam = async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const userId = req.user.userId || req.user.id;

    console.log("🔍 [LEAVE-TEAM] Request:", { teamId, userId });

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    if (team.owner.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "Owner cannot leave team",
      });
    }

    team.members = team.members.filter((m) => m.user.toString() !== userId);
    await team.save();

    const memberUser = await User.findById(userId);
    if (memberUser) {
      memberUser.teams = memberUser.teams.filter(
        (t) => t.toString() !== teamId
      );
      await memberUser.save();
    }

    const updatedTeam = await Team.findById(teamId)
      .populate("members.user", "username email avatar")
      .populate("game", "name");

    console.log("✅ [LEAVE-TEAM] User left team:", updatedTeam.name);

    res.status(200).json({
      success: true,
      message: "Left team",
      team: updatedTeam,
    });
  } catch (error) {
    console.error("❌ [LEAVE-TEAM] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error leaving team",
      error: error.message
    });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const { teamId, memberId } = req.params;
    const userId = req.user.userId || req.user.id;

    console.log("🔍 [REMOVE-MEMBER] Request:", { teamId, memberId, userId });

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    if (team.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const memberToRemove = team.members.id(memberId);
    if (!memberToRemove) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    if (memberToRemove.user.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "Owner cannot be removed",
      });
    }

    team.members = team.members.filter((m) => m._id.toString() !== memberId);
    await team.save();

    const memberUser = await User.findById(memberToRemove.user);
    if (memberUser) {
      memberUser.teams = memberUser.teams.filter(
        (t) => t.toString() !== teamId
      );
      await memberUser.save();
    }

    const updatedTeam = await Team.findById(teamId)
      .populate("members.user", "username email avatar")
      .populate("game", "name");

    console.log("✅ [REMOVE-MEMBER] Member removed from team:", updatedTeam.name);

    res.status(200).json({
      success: true,
      message: "Member removed",
      team: updatedTeam,
    });
  } catch (error) {
    console.error("❌ [REMOVE-MEMBER] Error:", error);
    res.status(500).json({
      success: false,
      message: "Error removing member",
      error: error.message
    });
  }
};