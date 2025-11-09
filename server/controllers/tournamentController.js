const Tournament = require("../models/Tournament");
const Match = require("../models/Match");
const Team = require("../models/Team");

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

function makeBracketTemplate(teamsCount, bracketType) {
  switch (bracketType) {
    case "SINGLE_ELIM": {
      const slots = nextPowerOfTwo(teamsCount);
      const result = [];
      for (let i = 0; i < slots - 1; i++) {
        result.push({ slot: i, teamA: null, teamB: null });
      }
      return result;
    }
    case "DOUBLE_ELIM": {
      const slots = nextPowerOfTwo(teamsCount);
      const result = [];
      const winnersCount = slots - 1;
      const losersCount = winnersCount;
      for (let i = 0; i < winnersCount; i++) {
        result.push({ slot: i, teamA: null, teamB: null });
      }
      for (let i = 0; i < losersCount; i++) {
        result.push({
          slot: winnersCount + i,
          teamA: null,
          teamB: null,
        });
      }
      return result;
    }
    case "ROUND_ROBIN": {
      const result = [];
      let slot = 0;
      for (let i = 0; i < teamsCount; i++) {
        for (let j = i + 1; j < teamsCount; j++) {
          result.push({ slot: slot++, teamA: null, teamB: null });
        }
      }
      return result;
    }
    default:
      throw new Error(`Unsupported bracket type: ${bracketType}`);
  }
}

// ===========================
// CONTROLLER METHODS
// ===========================

/**
 * @desc    List all tournaments
 * @route   GET /api/tournaments
 * @access  Public
 */
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

/**
 * @desc    Get single tournament by ID
 * @route   GET /api/tournaments/:id
 * @access  Public
 */
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

/**
 * @desc    Create a new tournament
 * @route   POST /api/tournaments
 * @access  Private
 */
exports.createTournament = async (req, res) => {
  try {
    const { name, description, startDate, game, maxParticipants, phases } =
      req.body;

    console.log("Creating tournament with user ID:", req.user.userId);

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

/**
 * @desc    Update tournament details
 * @route   PUT /api/tournaments/:id
 * @access  Private (Organizer only)
 */
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

    // Update fields if provided
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

/**
 * @desc    Delete a tournament
 * @route   DELETE /api/tournaments/:id
 * @access  Private (Organizer only)
 */
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

/**
 * @desc    Lock registrations for a tournament
 * @route   PUT /api/tournaments/:id/lock-registrations
 * @access  Private (Organizer only)
 */
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

/**
 * @desc    Lock bracket and generate matches
 * @route   PUT /api/tournaments/:id/lock-bracket
 * @access  Private (Organizer only)
 */
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

    // Delete existing matches and generate new ones
    await Match.deleteMany({ tournament: req.params.id });
    for (let idx = 0; idx < tourney.phases.length; idx++) {
      const phase = tourney.phases[idx];
      const template = makeBracketTemplate(
        tourney.teams.length,
        phase.bracketType
      );
      const docs = template.map((m) => ({
        tournament: tourney._id,
        phaseIndex: idx,
        slot: m.slot,
        teamA: m.teamA,
        teamB: m.teamB,
      }));
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

/**
 * @desc    Start the tournament
 * @route   PUT /api/tournaments/:id/start
 * @access  Private (Organizer or Referee)
 */
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

/**
 * @desc    Complete the tournament
 * @route   PUT /api/tournaments/:id/complete
 * @access  Private (Organizer only)
 */
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

/**
 * @desc    Add team to tournament (request to join)
 * @route   POST /api/tournaments/:id/teams
 * @access  Private
 */
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

    tourney.pendingTeams.push(teamId);
    await tourney.save();

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

/**
 * @desc    Get pending teams
 * @route   GET /api/tournaments/:id/teams/pending
 * @access  Private (Organizer only)
 */
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

/**
 * @desc    Approve a pending team
 * @route   PUT /api/tournaments/:id/teams/:tid/approve
 * @access  Private (Organizer only)
 */
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

/**
 * @desc    Remove a team from tournament
 * @route   DELETE /api/tournaments/:id/teams/:tid
 * @access  Private (Organizer or Team Owner)
 */
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

    tourney.pendingTeams = tourney.pendingTeams.filter(
      (t) => t.toString() !== req.params.tid
    );
    tourney.teams = tourney.teams.filter(
      (t) => t.toString() !== req.params.tid
    );
    await tourney.save();

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

/**
 * @desc    Add referee using referee code
 * @route   POST /api/tournaments/:id/referees
 * @access  Private
 */
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

/**
 * @desc    Remove a referee
 * @route   DELETE /api/tournaments/:id/referees/:uid
 * @access  Private (Organizer or Self)
 */
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

/**
 * @desc    Update phase status
 * @route   PUT /api/tournaments/:id/phases/:idx
 * @access  Private (Organizer only)
 */
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

/**
 * @desc    Get bracket template for a phase
 * @route   GET /api/tournaments/:id/bracket-template/:phaseIndex
 * @access  Private (Organizer or Referee)
 */
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

/**
 * @desc    Update bracket (bulk update matches)
 * @route   PUT /api/tournaments/:id/bracket
 * @access  Private (Organizer only)
 */
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