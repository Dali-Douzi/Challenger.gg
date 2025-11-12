const express = require("express");
const router = express.Router();
const scrimController = require("../controllers/scrimController");
const authMiddleware = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

// Scrim CRUD operations
router.get("/", scrimController.listScrims);
router.post("/", scrimController.createScrim);
router.get("/:scrimId", scrimController.getScrim);
router.put("/:scrimId", scrimController.updateScrim);
router.delete("/:scrimId", scrimController.deleteScrim);
router.put("/:scrimId/complete", scrimController.completeScrim);

// Scrim request management
router.post("/request/:scrimId", scrimController.requestScrim);
router.put("/accept/:scrimId", scrimController.acceptScrim);
router.put("/decline/:scrimId", scrimController.declineScrim);

module.exports = router;