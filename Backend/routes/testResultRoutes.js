const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  submitTest,
  getMyResults,
  getResultById,
  getMyStats,
} = require("../controllers/testResultController");

// All routes require authentication
router.post("/submit", protect, submitTest);
router.get("/my-results", protect, getMyResults);
router.get("/my-stats", protect, getMyStats);
router.get("/:id", protect, getResultById);

module.exports = router;
