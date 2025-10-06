const express = require("express");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const authController = require("../controllers/authController");
const auth = require("./middleware/authMiddleware");
const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "challenger/avatars",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [
      { width: 400, height: 400, crop: "fill" },
      { quality: "auto", fetch_format: "auto" },
    ],
    public_id: (req, file) => {
      return `avatar_${req.user?.userId || Date.now()}_${Math.round(
        Math.random() * 1e9
      )}`;
    },
  },
});

// Multer upload configuration
const avatarUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter(req, file, cb) {
    const allowedTypes = ["image/png", "image/jpg", "image/jpeg", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only static image files (PNG, JPG, JPEG, WEBP) are allowed!"
        ),
        false
      );
    }
  },
});

// Error handler wrapper for multer
const handleUpload = (req, res, next) => {
  avatarUpload.single("avatar")(req, res, (err) => {
    if (err) {
      console.error("Avatar upload error:", err);

      const errorMessage =
        err.code === "LIMIT_FILE_SIZE"
          ? "File too large. Maximum size is 10MB"
          : err.message || "Avatar upload failed";

      return res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }
    next();
  });
};

// Public routes
router.post("/signup", authLimiter, handleUpload, authController.signup);
router.post("/login", authLimiter, authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/health", authController.healthCheck);

// Protected routes
router.get("/profile", auth, authController.getProfile);
router.get("/me", auth, authController.getMe);
router.put("/change-email", auth, authController.changeEmail);
router.put("/change-password", auth, authController.changePassword);
router.put("/change-username", auth, authController.changeUsername);
router.put("/change-avatar", auth, handleUpload, authController.changeAvatar);
router.delete("/delete-avatar", auth, authController.deleteAvatar);
router.delete("/delete-account", auth, authController.deleteAccount);

module.exports = router;