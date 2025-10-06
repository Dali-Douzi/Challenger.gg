const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const teamController = require("../controllers/teamController");
const protect = require("../middleware/authMiddleware");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage for team logos
const logoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "challenger/team-logos",
    allowed_formats: ["jpg", "png", "jpeg", "webp", "gif"],
    transformation: [
      { width: 400, height: 400, crop: "fill" },
      { quality: "auto", fetch_format: "auto" },
    ],
    public_id: (req, file) => {
      return `team_logo_${req.params.id || Date.now()}_${Math.round(
        Math.random() * 1e9
      )}`;
    },
  },
});

// Multer configuration for logo uploads
const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowedTypes = [
      "image/png",
      "image/jpg",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Only image files (PNG, JPG, JPEG, WEBP, GIF) are allowed!"),
        false
      );
    }
  },
});

// Error handler wrapper for multer
const handleLogoUpload = (req, res, next) => {
  logoUpload.single("logo")(req, res, (err) => {
    if (err) {
      console.error("Logo upload error:", err);
      return res.status(400).json({
        success: false,
        message: err.message || "Logo upload failed",
      });
    }
    next();
  });
};

// Optional authentication middleware
const optionalProtect = (req, res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId };
  } catch (err) {
    req.user = null;
  }
  next();
};

// Public routes
router.get("/games", teamController.getGames);
router.get("/:id", optionalProtect, teamController.getTeamById);

// Protected routes
router.get("/my", protect, teamController.getMyTeams);
router.post("/create", protect, handleLogoUpload, teamController.createTeam);
router.post("/join", protect, teamController.joinTeamByCode);
router.post("/:id/join", protect, teamController.joinTeamById);
router.put("/:id", protect, handleLogoUpload, teamController.updateTeam);
router.put("/:id/logo", protect, handleLogoUpload, teamController.updateTeamLogo);
router.delete("/:id/logo", protect, teamController.deleteTeamLogo);
router.delete("/:id", protect, teamController.deleteTeam);

// Member management routes
router.put("/:teamId/members/:memberId/role", protect, teamController.updateMemberRole);
router.put("/:teamId/members/:memberId/rank", protect, teamController.updateMemberRank);
router.delete("/:teamId/members/self", protect, teamController.leaveTeam);
router.delete("/:teamId/members/:memberId", protect, teamController.removeMember);

module.exports = router;