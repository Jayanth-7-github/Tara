const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");

// POST /api/attendance  -> body: { regno, eventName }
router.post("/", attendanceController.markAttendance);

// GET /api/attendance/summary -> basic summary
router.get("/summary", attendanceController.getSummary);

// GET /api/attendance/export -> download CSV
router.get("/export", attendanceController.exportCSV);

// PUT /api/attendance/:regno -> update a specific student's attendance (body: { eventName?, name?, isPresent?, timestamp?, newEventName? })
router.put("/:regno", attendanceController.updateAttendance);

// DELETE /api/attendance/:regno -> delete a specific student's attendance (eventName via query or body)
router.delete("/:regno", attendanceController.deleteAttendance);

module.exports = router;
