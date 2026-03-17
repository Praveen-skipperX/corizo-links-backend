import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import morgan from "morgan";

import { globalLimiter } from "./middleware/rateLimiter";
import activityRoutes from "./routes/activities";
import authRoutes from "./routes/auth";
import linkRoutes from "./routes/links";
import userRoutes from "./routes/users";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust Vercel's reverse proxy — required for accurate req.ip and rate limiting
app.set("trust proxy", 1);

// Support comma-separated origins: CLIENT_URL=https://links.corizo.in,https://corizo-links-frontend.vercel.app
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

const isDev = process.env.NODE_ENV !== "production";

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // In development allow any localhost port (Vite can drift from 5173 → 5174/5175/...)
      const isLocalhost =
        isDev &&
        (origin?.startsWith("http://localhost:") ||
          origin?.startsWith("http://127.0.0.1:"));

      if (!origin || isLocalhost || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Request parsing
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Rate limiting
app.use("/api", globalLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/links", linkRoutes);
app.use("/api/activities", activityRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res
    .status(200)
    .json({
      success: true,
      message: "Corizo Links API is running.",
      timestamp: new Date(),
    });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// ─── Startup ─────────────────────────────────────────────────────────────────
const mongoUri = (process.env.MONGO_URI || process.env.MONGODB_URI) as string;

if (process.env.VERCEL) {
  // Serverless: Vercel handles the HTTP listener; just connect to MongoDB.
  // Mongoose caches the connection across warm invocations automatically.
  mongoose
    .connect(mongoUri)
    .then(() => console.log("MongoDB connected (serverless)."))
    .catch((err) => console.error("MongoDB connection error:", err));
} else {
  // Local / traditional server: connect then listen
  const startServer = async (): Promise<void> => {
    try {
      await mongoose.connect(mongoUri);
      console.log("MongoDB connected successfully.");
      app.listen(PORT, () => {
        console.log(
          `Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode.`,
        );
      });
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      process.exit(1);
    }
  };
  startServer();
}

export default app;
