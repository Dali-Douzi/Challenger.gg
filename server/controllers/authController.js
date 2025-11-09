const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const User = require("../models/User");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to format user response
const formatUserResponse = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
  discordAvatar: user.discordAvatar,
  teams: user.teams,
  createdAt: user.createdAt,
});

// Helper Functions
const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return input.trim().replace(/[<>]/g, "");
};

const validateUserChanges = async (userId, changes) => {
  const errors = [];
  const { username, email, password } = changes;

  if (username) {
    if (username.length < 3) {
      errors.push("Username must be at least 3 characters long");
    } else {
      const usernameExists = await User.findOne({
        username,
        _id: { $ne: userId },
      });
      if (usernameExists)
        errors.push(
          "Username is already taken, try adding numbers or special characters"
        );
    }
  }

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push("Please provide a valid email address");
    } else {
      const emailExists = await User.findOne({ email, _id: { $ne: userId } });
      if (emailExists) errors.push("Email is already taken");
    }
  }

  if (password) {
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    const commonPasswords = [
      "password",
      "12345678",
      "qwerty123",
      "password123",
      "admin123",
    ];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    } else if (!passwordRegex.test(password)) {
      errors.push(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"
      );
    } else if (commonPasswords.includes(password.toLowerCase())) {
      errors.push(
        "Password is too common, please choose a more secure password"
      );
    }
  }

  return { isValid: errors.length === 0, errors };
};

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

const getCookieConfig = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  domain:
    process.env.NODE_ENV === "production"
      ? process.env.COOKIE_DOMAIN
      : undefined,
});

const setAuthCookies = (res, accessToken, refreshToken) => {
  const cookieConfig = getCookieConfig();

  res.cookie("accessToken", accessToken, {
    ...cookieConfig,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieConfig,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookies = (res) => {
  const cookieConfig = getCookieConfig();
  res.clearCookie("accessToken", cookieConfig);
  res.clearCookie("refreshToken", cookieConfig);
};

const deleteOldAvatar = async (avatarUrl) => {
  try {
    if (avatarUrl && avatarUrl.includes("cloudinary")) {
      const publicId = avatarUrl.split("/").pop().split(".")[0];
      const fullPublicId = `challenger/avatars/${publicId}`;

      const result = await cloudinary.uploader.destroy(fullPublicId);
      console.log(
        `Deleted old avatar from Cloudinary: ${fullPublicId}`,
        result
      );
    }
  } catch (error) {
    console.error("Error deleting old avatar from Cloudinary:", error);
  }
};

const runPostDeletionCleanup = async (verbose = false) => {
  try {
    if (verbose) console.log("🧹 Running post-deletion cleanup...");

    const Team = require("../models/Team");
    const Scrim = require("../models/Scrim");
    const Notification = require("../models/Notification");
    const ScrimChat = require("../models/ScrimChat");

    const orphanedTeams = await Team.find({}).populate("owner", "_id");
    let cleanedTeams = 0;

    for (const team of orphanedTeams) {
      if (!team.owner) {
        await User.updateMany(
          { teams: team._id },
          { $pull: { teams: team._id } }
        );

        const orphanedScrims = await Scrim.find({ teamA: team._id });
        for (const scrim of orphanedScrims) {
          await ScrimChat.deleteMany({ scrim: scrim._id });
          await Notification.deleteMany({ scrim: scrim._id });
          await Scrim.findByIdAndDelete(scrim._id);
        }

        await Scrim.updateMany(
          { requests: team._id },
          { $pull: { requests: team._id } }
        );

        await Team.findByIdAndDelete(team._id);
        cleanedTeams++;
        if (verbose) console.log(`🧹 Cleaned orphaned team: ${team.name}`);
      }
    }

    const orphanedScrims = await Scrim.find({}).populate("teamA", "_id");
    let cleanedScrims = 0;

    for (const scrim of orphanedScrims) {
      if (!scrim.teamA) {
        await ScrimChat.deleteMany({ scrim: scrim._id });
        await Notification.deleteMany({ scrim: scrim._id });
        await Scrim.findByIdAndDelete(scrim._id);
        cleanedScrims++;
        if (verbose) console.log(`🧹 Cleaned orphaned scrim: ${scrim._id}`);
      }
    }

    const orphanedNotifications = await Notification.deleteMany({
      scrim: { $exists: false },
    });

    if (verbose) {
      console.log(
        `✅ Post-deletion cleanup completed: ${cleanedTeams} teams, ${cleanedScrims} scrims, ${orphanedNotifications.deletedCount} orphaned notifications`
      );
    }

    return {
      cleanedTeams,
      cleanedScrims,
      cleanedOrphanedNotifications: orphanedNotifications.deletedCount,
    };
  } catch (error) {
    console.error("⚠️ Post-deletion cleanup failed:", error);
    return {
      cleanedTeams: 0,
      cleanedScrims: 0,
      cleanedOrphanedNotifications: 0,
      error: error.message,
    };
  }
};

// Controller Methods
exports.signup = async (req, res) => {
  try {
    let { username, email, password } = req.body;

    username = sanitizeInput(username);
    email = sanitizeInput(email);

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide username, email, and password",
      });
    }

    const validation = await validateUserChanges(null, {
      username,
      email,
      password,
    });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(". "),
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists",
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userData = {
      username,
      email,
      password: hashedPassword,
      teams: [],
      avatar: req.file ? req.file.path : "",
    };

    const user = new User(userData);
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user._id);
    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
      }),
    });
  }
};

exports.login = async (req, res) => {
  try {
    let { identifier, password, rememberMe } = req.body;

    identifier = sanitizeInput(identifier);

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide username/email and password",
      });
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    const user = await User.findOne(
      isEmail ? { email: identifier } : { username: identifier }
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      message: "Login successful",
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
      }),
    });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not provided",
        code: "NO_REFRESH_TOKEN",
      });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      user._id
    );
    setAuthCookies(res, accessToken, newRefreshToken);

    res.json({
      success: true,
      message: "Token refreshed successfully",
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    clearAuthCookies(res);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Refresh token expired",
        code: "REFRESH_TOKEN_EXPIRED",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
        code: "INVALID_REFRESH_TOKEN",
      });
    }

    res.status(401).json({
      success: false,
      message: "Token refresh failed",
      code: "REFRESH_FAILED",
    });
  }
};

exports.logout = (req, res) => {
  clearAuthCookies(res);
  res.json({
    success: true,
    message: "Logged out successfully",
  });
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
      }),
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
      }),
    });
  }
};

exports.changeEmail = async (req, res) => {
  try {
    let { newEmail, currentPassword } = req.body;

    newEmail = sanitizeInput(newEmail);

    if (!newEmail || !currentPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide new email and current password",
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const validation = await validateUserChanges(user._id, { email: newEmail });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(". "),
      });
    }

    user.email = newEmail;
    await user.save();

    res.json({
      success: true,
      message: "Email updated successfully",
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Change email error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating email",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
      }),
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide current password and new password",
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const validation = await validateUserChanges(user._id, {
      password: newPassword,
    });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(". "),
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedNewPassword;
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating password",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
      }),
    });
  }
};

exports.changeUsername = async (req, res) => {
  try {
    let { newUsername, currentPassword } = req.body;

    newUsername = sanitizeInput(newUsername);

    if (!newUsername || !currentPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide new username and current password",
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const validation = await validateUserChanges(user._id, {
      username: newUsername,
    });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(". "),
      });
    }

    user.username = newUsername;
    await user.save();

    res.json({
      success: true,
      message: "Username updated successfully",
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Change username error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating username",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
      }),
    });
  }
};

exports.changeAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please provide an avatar image",
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.avatar) {
      await deleteOldAvatar(user.avatar);
    }

    user.avatar = req.file.path;
    await user.save();

    console.log("Avatar updated successfully:", user.avatar);

    res.json({
      success: true,
      message: "Avatar updated successfully",
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Change avatar error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating avatar",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
      }),
    });
  }
};

exports.deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.avatar) {
      await deleteOldAvatar(user.avatar);
      user.avatar = "";
      await user.save();
    }

    res.json({
      success: true,
      message: "Avatar deleted successfully",
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Delete avatar error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting avatar",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
      }),
    });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const { currentPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide your current password to delete your account",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    console.log(`🗑️ User deletion initiated: ${user.username} (${user.email})`);

    if (user.avatar) {
      await deleteOldAvatar(user.avatar);
    }

    const Team = require("../models/Team");

    await Team.updateMany(
      { "members.user": userId },
      { $pull: { members: { user: userId } } }
    );

    await User.findByIdAndDelete(userId);

    clearAuthCookies(res);

    console.log(`✅ User account deleted: ${user.username}`);

    try {
      const cleanupResults = await runPostDeletionCleanup(true);
      console.log("✅ Post-deletion cleanup completed:", cleanupResults);
    } catch (cleanupError) {
      console.error("⚠️ Post-deletion cleanup failed:", cleanupError);
    }

    res.json({
      success: true,
      message: "Account deleted successfully. We're sorry to see you go!",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting account",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
      }),
    });
  }
};

exports.healthCheck = (req, res) => {
  res.json({
    success: true,
    message: "Auth service is healthy",
    timestamp: new Date().toISOString(),
  });
};