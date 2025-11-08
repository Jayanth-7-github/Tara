const express = require("express");
const router = express.Router();
const { protect, requireAdmin } = require("../middleware/auth");
const {
  submitTest,
  getMyResults,
  getResultById,
  getMyStats,
  checkTaken,
} = require("../controllers/testResultController");

// All routes require authentication
router.post("/submit", protect, submitTest);
// Allow users to check if they've taken a test (no admin required).
router.get("/check", protect, checkTaken);

// Admin-only reads: require admin token. Admin may pass ?userId=... to fetch results for a specific user.
router.get("/my-results", protect, requireAdmin, getMyResults);
router.get("/my-stats", protect, requireAdmin, getMyStats);
router.get("/:id", protect, requireAdmin, getResultById);

module.exports = router;
