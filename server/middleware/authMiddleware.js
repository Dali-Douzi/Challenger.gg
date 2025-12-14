const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const { accessToken, refreshToken } = req.cookies;

    // If no tokens at all, return clean 401
    if (!accessToken && !refreshToken) {
      return res.status(401).json({
        success: false,
        message: "No authentication tokens provided",
        code: "NO_TOKENS",
      });
    }

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "Access token not provided",
        code: "NO_ACCESS_TOKEN",
      });
    }

    try {
      // Try to verify the access token
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      
      // ✅ FIX: Set consistent user ID properties for frontend/backend compatibility
      req.user = {
        userId: decoded.userId || decoded.id, // Primary property (backend uses this)
        id: decoded.userId || decoded.id,     // Alias for consistency (frontend may use this)
        ...decoded                            // Include all other decoded properties
      };
      
      console.log("🔍 [AUTH] User authenticated:", {
        userId: req.user.userId,
        id: req.user.id,
        keys: Object.keys(req.user)
      });
      
      return next();
    } catch (tokenError) {
      // If access token is expired, check if we can refresh
      if (tokenError.name === "TokenExpiredError" && refreshToken) {
        try {
          console.log("🔄 [AUTH] Access token expired, attempting refresh...");
          
          // Verify refresh token
          const refreshDecoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
          );

          // Generate new access token
          const newAccessToken = jwt.sign(
            { userId: refreshDecoded.userId },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
          );

          // Set new access token cookie
          const cookieConfig = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
            domain:
              process.env.NODE_ENV === "production"
                ? process.env.COOKIE_DOMAIN
                : undefined,
            maxAge: 15 * 60 * 1000, // 15 minutes
          };

          res.cookie("accessToken", newAccessToken, cookieConfig);

          // ✅ FIX: Set consistent user ID properties
          req.user = {
            userId: refreshDecoded.userId || refreshDecoded.id,
            id: refreshDecoded.userId || refreshDecoded.id,
            ...refreshDecoded
          };
          
          console.log("✅ [AUTH] Token refreshed successfully:", {
            userId: req.user.userId,
            id: req.user.id
          });
          
          return next();
        } catch (refreshError) {
          console.error("❌ [AUTH] Token refresh failed:", refreshError.message);
          return res.status(401).json({
            success: false,
            message: "Token refresh failed",
            code: "REFRESH_FAILED",
          });
        }
      }

      // Token expired and no valid refresh token
      console.error("❌ [AUTH] Token expired:", tokenError.message);
      return res.status(401).json({
        success: false,
        message: "Token expired",
        code: "TOKEN_EXPIRED",
      });
    }
  } catch (error) {
    console.error("❌ [AUTH] Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
      code: "AUTH_ERROR",
    });
  }
};

module.exports = authMiddleware;
exports.protect = authMiddleware;