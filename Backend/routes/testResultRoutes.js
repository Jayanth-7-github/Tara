const express = require("express");
const router = express.Router();
const { protect, requireAdmin } = require("../middleware/auth");
const {
  submitTest,
  getMyResults,
  getResultById,
  getMyStats,
} = require("../controllers/testResultController");

// All routes require authentication
router.post("/submit", protect, submitTest);
// Admin-only reads: require admin token. Admin may pass ?userId=... to fetch results for a specific user.
router.get("/my-results", protect, requireAdmin, getMyResults);
router.get("/my-stats", protect, requireAdmin, getMyStats);
router.get("/:id", protect, requireAdmin, getResultById);

module.exports = router;
