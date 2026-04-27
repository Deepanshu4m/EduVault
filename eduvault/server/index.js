require("dotenv").config();

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

app.set("trust proxy", 1);

app.use(helmet());

if (NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

app.use(compression());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX
    ? parseInt(process.env.RATE_LIMIT_MAX)
    : 100,
});
app.use(limiter);

// ✅ FINAL CORS FIX (KEEP THIS)
app.use(
  cors({
    origin: [
      "https://edu-vault-rho.vercel.app",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: process.env.TEMP_DIR || "/tmp",
    limits: { fileSize: 50 * 1024 * 1024 },
    abortOnLimit: true,
  })
);

if (NODE_ENV === "production") {
  const staticDir = path.join(__dirname, "public");
  app.use(express.static(staticDir));
}

app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/course", courseRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/reach", contactUsRoute);

app.get("/health", (req, res) =>
  res.status(200).json({ success: true, uptime: process.uptime() })
);

app.get("/", (req, res) =>
  res.json({ success: true, message: "Your server is up and running...." })
);

let server;

async function startServer() {
  try {
    await Promise.resolve(database.connect && database.connect());
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

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
  shutdown(1);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  shutdown(1);
});

function shutdown(code = 0) {
  if (server) {
    server.close(() => {
      console.log("Server closed.");
      if (database && typeof database.disconnect === "function") {
        try {
          database.disconnect();
        } catch (e) {}
      }
      process.exit(code);
    });

    setTimeout(() => {
      console.error("Forcing shutdown.");
      process.exit(code);
    }, 10000);
  } else {
    process.exit(code);
  }
}

module.exports = app;