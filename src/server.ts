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
const mongoUri = (process.env.MONGO_URI || process.env.MONGODB_URI) as string;

// Trust Vercel's reverse proxy — required for accurate req.ip and rate limiting
app.set("trust proxy", 1);

// ─── CORS ────────────────────────────────────────────────────────────────────
// CLIENT_URL supports comma-separated list:
//   https://links.corizo.in,https://corizo-links-frontend.vercel.app
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

const isDev = process.env.NODE_ENV !== "production";

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true; // curl / Postman / server-to-server

  // Dev: allow any localhost port (Vite can drift from 5173 → 5174/5175/…)
  if (
    isDev &&
    (origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:"))
  )
    return true;

  // Explicit whitelist (production custom domain + stable vercel.app URL)
  if (allowedOrigins.includes(origin)) return true;

  // Vercel preview deployments: corizo-links-frontend-<hash>-<team>.vercel.app
  if (/^https:\/\/corizo-links-frontend.*\.vercel\.app$/.test(origin))
    return true;

  return false;
};

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
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
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─── DB connection ────────────────────────────────────────────────────────────
// Lazy connect: on each cold-start request, wait for the connection before
// passing to route handlers. Mongoose caches the connection across warm
// invocations so subsequent requests return immediately.
const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState >= 1) return;
  await mongoose.connect(mongoUri);
};

if (process.env.VERCEL) {
  // Serverless: ensure DB is ready before every request
  app.use(async (_req, _res, next) => {
    try {
      await connectDB();
      next();
    } catch (err) {
      console.error("MongoDB connection error:", err);
      next(err);
    }
  });
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use("/api", globalLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/links", linkRoutes);
app.use("/api/activities", activityRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Corizo Links API is running.",
    timestamp: new Date(),
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// ─── Local server startup ─────────────────────────────────────────────────────
if (!process.env.VERCEL) {
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
