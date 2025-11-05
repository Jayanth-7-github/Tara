require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Simple logger
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

// Routes
const studentRoutes = require(path.join(__dirname, "routes", "studentRoutes"));
const attendanceRoutes = require(path.join(
  __dirname,
  "routes",
  "attendanceRoutes"
));

app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);

// Health
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", timestamp: Date.now() })
);

// Fallback
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Database connection
const { connectDB, disconnectDB } = require(path.join(__dirname, "db"));

let server;

const startServer = async () => {
  try {
    // connect to MongoDB (reads from process.env.MONGO_URL)
    await connectDB(process.env.MONGO_URL);

    server = app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`Received ${signal} - shutting down`);

  // stop accepting new connections
  if (server && server.close)
    server.close(() => {
      // close DB connection then exit
      disconnectDB().finally(() => process.exit(0));
    });

  // Fallback force exit
  setTimeout(() => process.exit(1), 10000);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

module.exports = app;
