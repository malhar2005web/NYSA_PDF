import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import { initDB } from "./db/index.js";
import authRoutes from "./routes/authRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import printRoutes from "./routes/printRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import requisitionRoutes from "./routes/requisitionRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure upload folders exist
const bmrDir = path.join(__dirname, "uploads/bmr");
const bprDir = path.join(__dirname, "uploads/bpr");
if (!fs.existsSync(bmrDir)) fs.mkdirSync(bmrDir, { recursive: true });
if (!fs.existsSync(bprDir)) fs.mkdirSync(bprDir, { recursive: true });

// Global Middlewares
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Serve static PDF uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Endpoints
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/prints", printRoutes);
app.use("/api/v1/audit", auditRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/requisitions", requisitionRoutes);

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled API Error:", err);
  res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
});

// Start Server after Database Initialization
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Pharma BMR/BPR Backend Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize system backend:", err);
  });
