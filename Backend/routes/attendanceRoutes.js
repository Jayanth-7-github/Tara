const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");

// POST /api/attendance  -> body: { regno, eventName }
router.post("/", attendanceController.markAttendance);

// GET /api/attendance/summary -> basic summary
router.get("/summary", attendanceController.getSummary);

module.exports = router;
