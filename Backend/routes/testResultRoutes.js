const express = require("express");
const router = express.Router();
const { protect, requireAdmin } = require("../middleware/auth");
const {
  submitTest,
  getMyResults,
  getResultById,
  getMyStats,
  checkTaken,
  getAllResults,
} = require("../controllers/testResultController");

// All routes require authentication
const { delegate } = require("../engine/router");

// All routes require authentication
router.post("/submit", protect, delegate('submitTest', submitTest));

// Allow users to check if they've taken a test (no admin required).
router.get("/check", protect, delegate('checkTaken', checkTaken));

// Get all results (admin/manager only - check performed in controller)
router.get("/all", protect, delegate('getAllResults', getAllResults));

// User reads: allow users to fetch their own results/stats. 
// Admin access to others' data is handled via query params in the controller.
router.get("/my-results", protect, delegate('getMyResults', getMyResults));
router.get("/my-stats", protect, delegate('getMyStats', getMyStats));

// Admin-only: read any result by ID
router.get("/:id", protect, requireAdmin, delegate('getResultById', getResultById));

module.exports = router;
