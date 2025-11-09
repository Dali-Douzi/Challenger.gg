const express = require("express");
const router = express.Router();
const tournamentController = require("../controllers/tournamentController");
const protect = require("../middleware/authMiddleware");

async function isOrganizer(req, res, next) {
  const Tournament = require("../models/Tournament");
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
      message: "Organizer only",
    });
  }
  next();
}

router.get("/", tournamentController.listTournaments);
router.get("/:id", tournamentController.getTournament);

router.post("/", protect, tournamentController.createTournament);
router.put("/:id", protect, isOrganizer, tournamentController.updateTournament);
router.delete("/:id", protect, isOrganizer, tournamentController.deleteTournament);

router.put(
  "/:id/lock-registrations",
  protect,
  isOrganizer,
  tournamentController.lockRegistrations
);
router.put(
  "/:id/lock-bracket",
  protect,
  isOrganizer,
  tournamentController.lockBracket
);
router.put("/:id/start", protect, tournamentController.startTournament);
router.put(
  "/:id/complete",
  protect,
  isOrganizer,
  tournamentController.completeTournament
);

router.post("/:id/teams", protect, tournamentController.addTeam);
router.get(
  "/:id/teams/pending",
  protect,
  isOrganizer,
  tournamentController.getPendingTeams
);
router.put(
  "/:id/teams/:tid/approve",
  protect,
  isOrganizer,
  tournamentController.approveTeam
);
router.delete("/:id/teams/:tid", protect, tournamentController.removeTeam);

router.post("/:id/referees", protect, tournamentController.addReferee);
router.delete(
  "/:id/referees/:uid",
  protect,
  tournamentController.removeReferee
);

router.put(
  "/:id/phases/:idx",
  protect,
  isOrganizer,
  tournamentController.updatePhase
);

router.get(
  "/:id/bracket-template/:phaseIndex",
  protect,
  tournamentController.getBracketTemplate
);
router.put(
  "/:id/bracket",
  protect,
  isOrganizer,
  tournamentController.updateBracket
);

module.exports = router;