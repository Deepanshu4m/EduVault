const jwt = require("jsonwebtoken");
require("dotenv").config();
const User = require("../models/User");

// Verify and attach user to req.user
exports.auth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization") || "";
    const tokenFromHeader = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader || null;

    const token =
      (req.cookies && req.cookies.token) ||
      req.body?.token ||
      tokenFromHeader ||
      null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token is missing. Please provide a valid token.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured in environment.");
      return res.status(500).json({
        success: false,
        message: "Server configuration error.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Token is invalid or expired.",
      });
    }

    // If your token payload uses a different key (e.g. userId), adjust below
    const userId = decoded.id || decoded._id || decoded.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Token payload invalid: user id not found.",
      });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found for provided token.",
      });
    }

    // attach the full user document (without password) for downstream use
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while validating the token.",
    });
  }
};

// Role-authorizer factory to avoid repeated code
const authorize = (requiredRole) => (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated. Please login and try again.",
      });
    }

    if (req.user.accountType !== requiredRole) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This route is for ${requiredRole} only.`,
      });
    }

    next();
  } catch (error) {
    console.error("Authorize middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "User role cannot be verified, please try again.",
    });
  }
};

exports.isStudent = authorize("Student");
exports.isInstructor = authorize("Instructor");
exports.isAdmin = authorize("Admin");