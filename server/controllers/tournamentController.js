const Tournament = require("../models/Tournament");
const Match = require("../models/Match");
const Team = require("../models/Team");
const Notification = require("../models/Notification");
const notificationService = require("../services/notificationService");

function validateStatusTransition(currentStatus, newStatus) {
  const validTransitions = {
    REGISTRATION_OPEN: ["REGISTRATION_LOCKED"],
    REGISTRATION_LOCKED: ["BRACKET_LOCKED", "REGISTRATION_OPEN"],
    BRACKET_LOCKED: ["IN_PROGRESS"],
    IN_PROGRESS: ["COMPLETE"],
    COMPLETE: [],
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
}

function validateTournamentReadiness(tournament, targetStatus) {
  const teamCount = tournament.teams?.length || 0;

  switch (targetStatus) {
    case "REGISTRATION_LOCKED":
      if (teamCount < 2) {
        return {
          valid: false,
          message: "Need at least 2 teams to close registration",
        };
      }
      break;

    case "BRACKET_LOCKED":
      if (teamCount < 2) {
        return {
          valid: false,
          message: "Need at least 2 teams to lock bracket",
        };
      }
      if (tournament.status !== "REGISTRATION_LOCKED") {
        return { valid: false, message: "Must close registration first" };
      }
      break;

    case "IN_PROGRESS":
      if (tournament.status !== "BRACKET_LOCKED") {
        return { valid: false, message: "Must lock bracket first" };
      }
      break;

    case "COMPLETE":
      if (tournament.status !== "IN_PROGRESS") {
        return {
          valid: false,
          message: "Tournament must be in progress to complete",
        };
      }
      break;
  }

  return { valid: true };
}

async function generateUniqueCode() {
  let code;
  do {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (await Tournament.exists({ refereeCode: code }));
  return code;
}

function nextPowerOfTwo(n) {
  return 2 ** Math.ceil(Math.log2(n));
}

// Feature: Bracket generation - seeds teams with standard pairing (1 vs lowest, 2 vs 2nd lowest)
function seedTeamsInBracket(teams, bracketType) {
  const seededTeams = [...teams];
  const totalSlots = nextPowerOfTwo(teams.length);

  if (bracketType === "SINGLE_ELIM" || bracketType === "DOUBLE_ELIM") {
    const firstRoundMatches = Math.ceil(teams.length / 2);
    const seeds = [];

    for (let i = 0; i < firstRoundMatches; i++) {
      const topSeed = seededTeams[i];
      const bottomSeed = seededTeams[teams.length - 1 - i] || null;
      seeds.push({ teamA: topSeed, teamB: bottomSeed });
    }

    return seeds;
  }

  if (bracketType === "ROUND_ROBIN") {
    const pairs = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        pairs.push({ teamA: teams[i], teamB: teams[j] });
      }
    }
    return pairs;
  }

  return [];
}

// Feature: Bracket generation - creates match slots for various tournament formats
function makeBracketTemplate(teamsCount, bracketType) {
  switch (bracketType) {
    case "SINGLE_ELIM": {
      const slots = nextPowerOfTwo(teamsCount);
      const result = [];
      for (let i = 0; i < slots - 1; i++) {
        result.push({ slot: i, teamA: null, teamB: null, roundNumber: 0 });
      }
      return result;
    }
    case "DOUBLE_ELIM": {
      const slots = nextPowerOfTwo(teamsCount);
      const result = [];
      const winnersCount = slots - 1;
      const losersCount = winnersCount;
      for (let i = 0; i < winnersCount; i++) {
        result.push({ slot: i, teamA: null, teamB: null, roundNumber: 0, bracketPosition: "winners" });
      }
      for (let i = 0; i < losersCount; i++) {
        result.push({
          slot: winnersCount + i,
          teamA: null,
          teamB: null,
          roundNumber: 0,
          bracketPosition: "losers",
        });
      }
      return result;
    }
    case "ROUND_ROBIN": {
      const result = [];
      let slot = 0;
      for (let i = 0; i < teamsCount; i++) {
        for (let j = i + 1; j < teamsCount; j++) {
          result.push({ slot: slot++, teamA: null, teamB: null, roundNumber: 0 });
        }
      }
      return result;
    }
    case "SWISS_STAGE": {
      const numRounds = Math.ceil(Math.log2(teamsCount));
      const result = [];
      let slot = 0;
      for (let round = 0; round < numRounds; round++) {
        const matchesPerRound = Math.floor(teamsCount / 2);
        for (let i = 0; i < matchesPerRound; i++) {
          result.push({ slot: slot++, teamA: null, teamB: null, roundNumber: round });
        }
      }
      return result;
    }
    case "WILD_CARD": {
      const slots = nextPowerOfTwo(teamsCount);
      const result = [];
      for (let i = 0; i < slots - 1; i++) {
        result.push({ slot: i, teamA: null, teamB: null, roundNumber: 0 });
      }
      return result;
    }
    default:
      throw new Error(`Unsupported bracket type: ${bracketType}`);
  }
}

exports.listTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.find({})
      .populate("organizer", "username")
      .populate("teams", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tournaments.length,
      data: tournaments,
    });
  } catch (err) {
    console.error("Error listing tournaments:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};

exports.getTournamentByCode = async (req, res) => {
  try {
    const tourney = await Tournament.findOne({ refereeCode: req.params.code })
      .populate("organizer", "username")
      .populate("teams", "name logo")
      .populate("pendingTeams", "name logo")
      .populate("referees", "username");

    if (!tourney) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found with that referee code",
      });
    }

    const obj = tourney.toObject();
    obj.isOrganizer = req.user
      ? tourney.organizer._id.toString() === req.user.userId
      : false;
    obj.isReferee = req.user
      ? tourney.referees.some((r) => r._id.toString() === req.user.userId)
      : false;

    res.json({
      success: true,
      data: obj,
    });
  } catch (err) {
    console.error("Error fetching tournament by code:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};

exports.getTournament = async (req, res) => {
  try {
    const tourney = await Tournament.findById(req.params.id)
      .populate("organizer", "username")
      .populate("teams", "name logo")
      .populate("pendingTeams", "name logo")
      .populate("referees", "username");

    if (!tourney) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found",
      });
    }

    const obj = tourney.toObject();
    obj.isOrganizer = req.user
      ? tourney.organizer._id.toString() === req.user.userId
      : false;
    obj.isReferee = req.user
      ? tourney.referees.some((r) => r._id.toString() === req.user.userId)
      : false;

    if (req.user) {
      const userTeams = await Team.find({
        $or: [{ owner: req.user.userId }, { "members.user": req.user.userId }],
      }).select("_id");
      const myIds = userTeams.map((t) => t._id.toString());
      const pending = tourney.pendingTeams.find((t) =>
        myIds.includes(t._id.toString())
      );
      const approved = tourney.teams.find((t) =>
        myIds.includes(t._id.toString())
      );
      obj.myTeamId = (pending || approved)?._id || null;
      obj.isTeamApproved = Boolean(approved);
    }

    res.json({
      success: true,
      data: obj,
    });
  } catch (err) {
    console.error("Error fetching tournament:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};

exports.createTournament = async (req, res) => {
  try {
    const { name, description, startDate, game, maxParticipants, phases } =
      req.body;

    if (
      !name ||
      !description ||
      !startDate ||
      !game ||
      !maxParticipants ||
      !phases?.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (maxParticipants < 2) {
      return res.status(400).json({
        success: false,
        message: "Tournament must allow at least 2 participants",
      });
    }

    const refereeCode = await generateUniqueCode();
    const newTourney = new Tournament({
      name,
      description,
      startDate,
      game,
      maxParticipants,
      phases,
      organizer: req.user.userId,
      refereeCode,
    });

    await newTourney.save();

    const populated = await Tournament.findById(newTourney._id)
      .populate("organizer", "username")
      .populate("teams", "name")
      .populate("pendingTeams", "name")
      .populate("referees", "username");

    res.status(201).json({
      success: true,
      message: "Tournament created successfully",
      data: populated,
    });
  } catch (err) {
    console.error("Error creating tournament:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};

exports.updateTournament = async (req, res) => {
  try {
    const { name, description, startDate, game, maxParticipants } = req.body;

    const tourney = await Tournament.findById(req.params.id);
    if (!tourney) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found",
      });
    }

    if (tourney.organizer.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Only the tournament organizer can update this tournament",
      });
    }

    if (name) tourney.name = name;
    if (description) tourney.description = description;
    if (startDate) tourney.startDate = startDate;
    if (game) tourney.game = game;
    if (maxParticipants) {
      if (maxParticipants < tourney.teams.length) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot reduce max participants below current team count",
        });
      }
      tourney.maxParticipants = maxParticipants;
    }

    await tourney.save();

    const populated = await Tournament.findById(tourney._id)
      .populate("organizer", "username")
      .populate("teams", "name")
      .populate("pendingTeams", "name")
      .populate("referees", "username");

    res.json({
      success: true,
      message: "Tournament updated successfully",
      data: populated,
    });
  } catch (err) {
    console.error("Error updating tournament:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};

exports.deleteTournament = async (req, res) => {
  try {
    await Match.deleteMany({ tournament: req.params.id });
    await Tournament.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Tournament cancelled and deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting tournament:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};

exports.lockRegistrations = async (req, res) => {
  try {
    const tourney = await Tournament.findById(req.params.id);
    if (!tourney) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found",
      });
    }

    if (!validateStatusTransition(tourney.status, "REGISTRATION_LOCKED")) {
      return res.status(400).json({
        success: false,
        message: `Cannot lock registrations from status: ${tourney.status}`,
      });
    }

    const validation = validateTournamentReadiness(
      tourney,
      "REGISTRATION_LOCKED"
    );
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const updated = await Tournament.findByIdAndUpdate(
      req.params.id,
      { status: "REGISTRATION_LOCKED" },
      { new: true }
    )
      .populate("organizer", "username")
      .populate("teams", "name")
      .populate("pendingTeams", "name")
      .populate("referees", "username");

    try {
      const teamsWithMembers = await Team.find({
        _id: { $in: tourney.teams }
      }).select("name owner members");

      if (teamsWithMembers.length > 0) {
        await notificationService.notifyRegistrationLocked({
          tournament: updated,
          teams: teamsWithMembers,
        });
      }
    } catch (notifErr) {
      console.error("Error sending registration locked notifications:", notifErr);
    }

    res.json({
      success: true,
      message: "Tournament registrations locked",
      data: updated,
    });
  } catch (err) {
    console.error("Error locking registrations:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};

// Feature: Bracket generation - locks bracket and creates seeded matches for all phases
exports.lockBracket = async (req, res) => {
  try {
    const tourney = await Tournament.findById(req.params.id);
    if (!tourney) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found",
      });
    }

    if (!validateStatusTransition(tourney.status, "BRACKET_LOCKED")) {
      return res.status(400).json({
        success: false,
        message: `Cannot lock bracket from status: ${tourney.status}`,
      });
    }

    const validation = validateTournamentReadiness(tourney, "BRACKET_LOCKED");
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    tourney.status = "BRACKET_LOCKED";
    await tourney.save();

    await Match.deleteMany({ tournament: req.params.id });

    for (let idx = 0; idx < tourney.phases.length; idx++) {
      const phase = tourney.phases[idx];

      const seededPairs = seedTeamsInBracket(tourney.teams, phase.bracketType);
      const template = makeBracketTemplate(
        tourney.teams.length,
        phase.bracketType
      );

      const docs = template.map((m, index) => {
        const matchData = {
          tournament: tourney._id,
          phaseIndex: idx,
          slot: m.slot,
          teamA: m.teamA,
          teamB: m.teamB,
          roundNumber: m.roundNumber || 0,
        };

        if (index < seededPairs.length) {
          matchData.teamA = seededPairs[index].teamA;
          matchData.teamB = seededPairs[index].teamB;
          matchData.seed = index + 1;
        }

        if (m.bracketPosition) {
          matchData.bracketPosition = m.bracketPosition;
        }

        return matchData;
      });

      await Match.insertMany(docs);
    }

    const populatedTourney = await Tournament.findById(req.params.id)
      .populate("organizer", "username")
      .populate("teams", "name")
      .populate("pendingTeams", "name")
      .populate("referees", "username");

    res.json({
      success: true,
      message: "Bracket locked and matches generated",
      data: populatedTourney,
    });
  } catch (err) {
    console.error("Error locking bracket:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};

exports.startTournament = async (req, res) => {
  try {
    const tourney = await Tournament.findById(req.params.id);
    if (!tourney) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found",
      });
    }

    const userId = req.user.userId;
    const isOrganizer = tourney.organizer.toString() === userId;
    const isReferee = tourney.referees.some((r) => r.toString() === userId);

    if (!isOrganizer && !isReferee) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (!validateStatusTransition(tourney.status, "IN_PROGRESS")) {
      return res.status(400).json({
        success: false,
        message: `Cannot start tournament from status: ${tourney.status}`,
      });
    }

    const validation = validateTournamentReadiness(tourney, "IN_PROGRESS");
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const updated = await Tournament.findByIdAndUpdate(
      req.params.id,
      { status: "IN_PROGRESS" },
      { new: true }
    )
      .populate("organizer", "username")
      .populate("teams", "name")
      .populate("pendingTeams", "name")
      .populate("referees", "username");

    res.json({
      success: true,
      message: "Tournament started",
      data: updated,
    });
  } catch (err) {
    console.error("Error starting tournament:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};

exports.completeTournament = async (req, res) => {
  try {
    const tourney = await Tournament.findById(req.params.id);
    if (!tourney) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found",
      });
    }

    if (!validateStatusTransition(tourney.status, "COMPLETE")) {
      return res.status(400).json({
        success: false,
        message: `Cannot complete tournament from status: ${tourney.status}`,
      });
    }

    const validation = validateTournamentReadiness(tourney, "COMPLETE");
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const updated = await Tournament.findByIdAndUpdate(
      req.params.id,
      { status: "COMPLETE" },
      { new: true }
    )
      .populate("organizer", "username")
      .populate("teams", "name")
      .populate("pendingTeams", "name")
      .populate("referees", "username");

    res.json({
      success: true,
      message: "Tournament completed",
      data: updated,
    });
  } catch (err) {
    console.error("Error completing tournament:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};

exports.addTeam = async (req, res) => {
  try {
    const { teamId } = req.body;
    const tourney = await Tournament.findById(req.params.id);

    if (!tourney) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found",
      });
    }

    if (tourney.status !== "REGISTRATION_OPEN") {
      return res.status(400).json({
        success: false,
        message: "Registration is closed for this tournament",
      });
    }

    if (tourney.teams.length >= tourney.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: "Tournament is full",
      });
    }

    if (
      tourney.pendingTeams.includes(teamId) ||
      tourney.teams.includes(teamId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Already requested or joined",
      });
    }

    // Validate that the team's game matches the tournament's game
    const team = await Team.findById(teamId).populate("game", "name");
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    const teamGameName = team.game?.name || team.game;
    if (teamGameName !== tourney.game) {
      return res.status(400).json({
        success: false,
        message: `This tournament is for ${tourney.game}. Your team plays ${teamGameName}.`,
      });
    }

    tourney.pendingTeams.push(teamId);
    await tourney.save();

    try {
      await notificationService.notifyTournamentJoinRequest({
        tournament: tourney,
        team: team,
        organizerId: tourney.organizer.toString(),
      });
    } catch (notifErr) {
      console.error("Error sending join request notification:", notifErr);
    }

    res.json({
      success: true,
      message: "Request submitted",
    });
  } catch (err) {
    console.error("Error adding team to tournament:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};

exports.getPendingTeams = async (req, res) => {
  try {
    const tourney = await Tournament.findById(req.params.id).populate(
      "pendingTeams",
      "name logo"
    );

    res.json({
      success: true,
      data: tourney.pendingTeams,
    });
  } catch (err) {
    console.error("Error fetching pending teams:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};

exports.approveTeam = async (req, res) => {
  try {
    const tourney = await Tournament.findById(req.params.id);
    if (!tourney) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found",
      });
    }

    if (tourney.status !== "REGISTRATION_OPEN") {
      return res.status(400).json({
        success: false,
        message: "Cannot approve teams - registration is closed",
      });
    }

    if (tourney.teams.length >= tourney.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: "Cannot approve - tournament is full",
      });
    }

    tourney.pendingTeams = tourney.pendingTeams.filter(
      (t) => t.toString() !== req.params.tid
    );
    tourney.teams.push(req.params.tid);
    await tourney.save();

    try {
      const team = await Team.findById(req.params.tid);
      if (team) {
        await notificationService.notifyTournamentApproved({
          tournament: tourney,
          team: team,
        });

        await Notification.updateMany(
          {
            user: req.user.userId,
            tournament: tourney._id,
            type: "tournament_join_request",
            message: { $regex: team.name, $options: "i" },
            read: false,
          },
          { $set: { read: true } }
        );
      }
    } catch (notifErr) {
      console.error("Error sending approval notification:", notifErr);
    }

    res.json({
      success: true,
      message: "Team approved",
    });
  } catch (err) {
    console.error("Error approving team:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};

exports.removeTeam = async (req, res) => {
  try {
    const tourney = await Tournament.findById(req.params.id);
    const team = await Team.findById(req.params.tid);
    const isMyTeam =
      team &&
      (team.owner.toString() === req.user.userId ||
        team.members.some((m) => m.user.toString() === req.user.userId));

    if (tourney.organizer.toString() !== req.user.userId && !isMyTeam) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (
      tourney.status === "BRACKET_LOCKED" ||
      tourney.status === "IN_PROGRESS" ||
      tourney.status === "COMPLETE"
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove teams after bracket is locked",
      });
    }

    const wasPending = tourney.pendingTeams.some(
      (t) => t.toString() === req.params.tid
    );
    const isOrganizerAction = tourney.organizer.toString() === req.user.userId;

    tourney.pendingTeams = tourney.pendingTeams.filter(
      (t) => t.toString() !== req.params.tid
    );
    tourney.teams = tourney.teams.filter(
      (t) => t.toString() !== req.params.tid
    );
    await tourney.save();

    if (wasPending && isOrganizerAction && team) {
      try {
        await notificationService.notifyTournamentDenied({
          tournament: tourney,
          team: team,
        });

        await Notification.updateMany(
          {
            user: req.user.userId,
            tournament: tourney._id,
            type: "tournament_join_request",
            message: { $regex: team.name, $options: "i" },
            read: false,
          },
          { $set: { read: true } }
        );
      } catch (notifErr) {
        console.error("Error sending denial notification:", notifErr);
      }
    }

    res.json({
      success: true,
      message: "Team removed",
    });
  } catch (err) {
    console.error("Error removing team:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};

exports.addReferee = async (req, res) => {
  try {
    const { code } = req.body;
    const tourney = await Tournament.findById(req.params.id);

    if (!tourney) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found",
      });
    }

    if (tourney.refereeCode !== code) {
      return res.status(400).json({
        success: false,
        message: "Invalid referee code",
      });
    }

    if (!tourney.referees.includes(req.user.userId)) {
      tourney.referees.push(req.user.userId);
      await tourney.save();
    }

    res.json({
      success: true,
      message: "Added as referee",
    });
  } catch (err) {
    console.error("Error adding referee:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};

exports.removeReferee = async (req, res) => {
  try {
    const tourney = await Tournament.findById(req.params.id);

    if (
      tourney.organizer.toString() !== req.user.userId &&
      req.params.uid !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    tourney.referees = tourney.referees.filter(
      (r) => r.toString() !== req.params.uid
    );
    await tourney.save();

    res.json({
      success: true,
      message: "Referee removed",
    });
  } catch (err) {
    console.error("Error removing referee:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};

exports.updatePhase = async (req, res) => {
  try {
    const { status } = req.body;
    const tourney = await Tournament.findById(req.params.id);

    if (!tourney.phases[req.params.idx]) {
      return res.status(400).json({
        success: false,
        message: "Invalid phase index",
      });
    }

    if (tourney.status !== "IN_PROGRESS") {
      return res.status(400).json({
        success: false,
        message: "Can only update phases during tournament",
      });
    }

    tourney.phases[req.params.idx].status = status;
    await tourney.save();

    res.json({
      success: true,
      data: tourney.phases[req.params.idx],
    });
  } catch (err) {
    console.error("Error updating phase:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};

exports.getBracketTemplate = async (req, res) => {
  try {
    const tourney = await Tournament.findById(req.params.id);
    if (!tourney) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found",
      });
    }

    const userId = req.user.userId;
    const isOrganizer = tourney.organizer.toString() === userId;
    const isReferee = tourney.referees.some((r) => r.toString() === userId);

    if (!isOrganizer && !isReferee) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const idx = Number(req.params.phaseIndex);
    const phase = tourney.phases[idx];
    if (!phase) {
      return res.status(400).json({
        success: false,
        message: "Invalid phase index",
      });
    }

    const template = makeBracketTemplate(
      tourney.teams.length,
      phase.bracketType
    );

    res.json({
      success: true,
      data: template,
    });
  } catch (err) {
    console.error("Error getting bracket template:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};

exports.getMatches = async (req, res) => {
  try {
    const matches = await Match.find({ tournament: req.params.id })
      .populate("teamA", "name logo")
      .populate("teamB", "name logo")
      .populate("winner", "name logo")
      .populate("loser", "name logo")
      .sort({ phaseIndex: 1, roundNumber: 1, slot: 1 });

    res.json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (err) {
    console.error("Error fetching matches:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};

exports.updateMatch = async (req, res) => {
  try {
    const { scoreA, scoreB, winner, status } = req.body;

    const match = await Match.findById(req.params.matchId);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found",
      });
    }

    const tourney = await Tournament.findById(req.params.id);
    if (!tourney) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found",
      });
    }

    const userId = req.user.userId;
    const isOrganizer = tourney.organizer.toString() === userId;
    const isReferee = tourney.referees.some((r) => r.toString() === userId);

    if (!isOrganizer && !isReferee) {
      return res.status(403).json({
        success: false,
        message: "Only organizer or referees can update matches",
      });
    }

    if (scoreA !== undefined) match.scoreA = scoreA;
    if (scoreB !== undefined) match.scoreB = scoreB;
    if (winner) {
      match.winner = winner;
      if (match.teamA && match.teamB) {
        match.loser = winner.toString() === match.teamA.toString() ? match.teamB : match.teamA;
      }
    }
    if (status) match.status = status;

    await match.save();

    const populatedMatch = await Match.findById(match._id)
      .populate("teamA", "name logo")
      .populate("teamB", "name logo")
      .populate("winner", "name logo")
      .populate("loser", "name logo");

    res.json({
      success: true,
      message: "Match updated successfully",
      data: populatedMatch,
    });
  } catch (err) {
    console.error("Error updating match:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};

exports.updateBracket = async (req, res) => {
  try {
    const { phaseIndex, matches } = req.body;
    if (typeof phaseIndex !== "number" || !Array.isArray(matches)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload",
      });
    }

    const tourney = await Tournament.findById(req.params.id);
    if (!tourney) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found",
      });
    }

    if (
      tourney.status !== "BRACKET_LOCKED" &&
      tourney.status !== "IN_PROGRESS"
    ) {
      return res.status(400).json({
        success: false,
        message: "Can only update bracket after it's locked",
      });
    }

    const results = [];
    for (const m of matches) {
      const filter = { tournament: req.params.id, phaseIndex, slot: m.slot };

      const currentMatch = await Match.findOne(filter);

      const update = {};

      if (m.teamA !== undefined) {
        update.teamA = m.teamA;
      }
      if (m.teamB !== undefined) {
        update.teamB = m.teamB;
      }

      if (!currentMatch) {
        update.teamA = m.teamA || null;
        update.teamB = m.teamB || null;
      }

      const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
      results.push(await Match.findOneAndUpdate(filter, update, opts));
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Error updating bracket:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
      }),
    });
  }
};
