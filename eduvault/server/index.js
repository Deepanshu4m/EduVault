// server.js
require("dotenv").config(); // load .env as early as possible

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const fileUpload = require("express-fileupload");

const userRoutes = require("./routes/User");
const profileRoutes = require("./routes/Profile");
const paymentRoutes = require("./routes/Payments");
const courseRoutes = require("./routes/Course");
const contactUsRoute = require("./routes/Contact");
const database = require("./config/database");
const { cloudinaryConnect } = require("./config/cloudinary");

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || "development";

const app = express();

// --- middlewares ---
app.set("trust proxy", 1); // if behind proxy / load balancer

// Security headers
app.use(helmet());

// Logging
if (NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Compression
app.use(compression());

// Parse incoming requests
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Rate limiter (basic)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 100, // limit each IP
});
app.use(limiter);

// CORS: if FRONTEND_URL provided, enable credentials; otherwise allow all origins without credentials
const frontendUrl = process.env.FRONTEND_URL || "";
const corsOptions = {
  origin: frontendUrl || "*",
  credentials: !!frontendUrl,
};
app.use(cors(corsOptions));

// File upload settings
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: process.env.TEMP_DIR || "/tmp",
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    abortOnLimit: true,
  })
);

// Serve static assets (optional)
if (NODE_ENV === "production") {
  const staticDir = path.join(__dirname, "public");
  app.use(express.static(staticDir));
}

// --- routes ---
app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/course", courseRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/reach", contactUsRoute);

// health check
app.get("/health", (req, res) =>
  res.status(200).json({ success: true, uptime: process.uptime() })
);

// default route
app.get("/", (req, res) =>
  res.json({ success: true, message: "Your server is up and running...." })
);

// --- startup / graceful shutdown ---
let server;

async function startServer() {
  try {
    // connect to database (support both sync and async implementations)
    await Promise.resolve(database.connect && database.connect());
    // connect to cloudinary (if async)
    await Promise.resolve(cloudinaryConnect && cloudinaryConnect());

    server = app.listen(PORT, () => {
      console.log(
        `App is running at http://localhost:${PORT} | env=${NODE_ENV}`
      );
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();

// handle unexpected errors
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // graceful shutdown
  shutdown(1);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception thrown:", err);
  shutdown(1);
});

function shutdown(code = 0) {
  if (server) {
    server.close(() => {
      console.log("Server closed.");
      // close DB connections if provided
      if (database && typeof database.disconnect === "function") {
        try {
          database.disconnect();
        } catch (e) {
          // ignore
        }
      }
      process.exit(code);
    });

    // In case server doesn't close in time
    setTimeout(() => {
      console.error("Forcing shutdown.");
      process.exit(code);
    }, 10_000);
  } else {
    process.exit(code);
  }
}

// export for testing
module.exports = app;