require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();

// If QUIET=1 is set, suppress non-error console output so the terminal stays empty.
// This silences console.log/info/debug/warn across the app. Errors (console.error)
// will still be emitted so critical failures are visible unless you also
// redirect stderr when launching the process.
if (process.env.QUIET === "1") {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(",")
    : true,
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Simple logger: disabled by default to keep the backend terminal quiet.
// To enable request logging set the environment variable SHOW_REQUEST_LOGS=1
app.use((req, res, next) => {
  if (process.env.SHOW_REQUEST_LOGS === "1") {
    console.log(new Date().toISOString(), req.method, req.url);
  }
  next();
});

// Routes
const studentRoutes = require(path.join(__dirname, "routes", "studentRoutes"));
const attendanceRoutes = require(path.join(
  __dirname,
  "routes",
  "attendanceRoutes"
));
const authRoutes = require(path.join(__dirname, "routes", "authRoutes"));
const testResultRoutes = require(path.join(
  __dirname,
  "routes",
  "testResultRoutes"
));
const eventRoutes = require(path.join(__dirname, "routes", "eventRoutes"));
const rolesRoutes = require(path.join(__dirname, "routes", "rolesRoutes"));
const contactRoutes = require(path.join(__dirname, "routes", "contactRoutes"));


app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/test-results", testResultRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/contact", contactRoutes);
// Mount roles routes at an obscure numeric path to make discovery harder.
// The number used here matches the example identifier in `data/roles.json`.
app.use("/api/roles/secret8181", rolesRoutes);

// Health
app.get("/api/tara", (req, res) =>
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
