const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");

const { delegate } = require("../engine/router");

// POST /api/attendance  -> body: { regno, eventName }
router.post("/", delegate('markAttendance', attendanceController.markAttendance));

// GET /api/attendance/summary -> basic summary
router.get("/summary", delegate('getAttendanceSummary', attendanceController.getSummary));

// GET /api/attendance/export -> download CSV
router.get("/export", delegate('exportAttendance', attendanceController.exportCSV));

// GET /api/attendance/check/:regno -> check if student has marked attendance
router.get("/check/:regno", delegate('checkAttendance', attendanceController.checkAttendance));

// PUT /api/attendance/:regno -> update a specific student's attendance (body: { eventName?, name?, isPresent?, timestamp?, newEventName? })
router.put("/:regno", delegate('updateAttendance', attendanceController.updateAttendance));

// DELETE /api/attendance/:regno -> delete a specific student's attendance (eventName via query or body)
router.delete("/:regno", delegate('deleteAttendance', attendanceController.deleteAttendance));

module.exports = router;
