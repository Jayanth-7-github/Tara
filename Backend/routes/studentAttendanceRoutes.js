const express = require("express");
const router = express.Router();

const controller = require("../controllers/studentAttendanceController");
const { protect } = require("../middleware/auth");
const { delegate } = require("../engine/router");

// Students submit attendance with snapshot (data URL base64)
// POST /api/student-attendance/mark
router.post(
  "/mark",
  protect,
  delegate("markStudentAttendance", controller.markStudentAttendance),
);

// Event Manager approves/rejects
// PATCH /api/student-attendance/:id/review
router.patch(
  "/:id/review",
  protect,
  delegate("reviewStudentAttendance", controller.reviewStudentAttendance),
);

// Event Manager: allow student to re-mark after rejection
// PATCH /api/student-attendance/:id/allow-resubmit
router.patch(
  "/:id/allow-resubmit",
  protect,
  delegate(
    "allowStudentAttendanceResubmit",
    controller.allowStudentAttendanceResubmit,
  ),
);

// Fetch records by team and (optional) session
// GET /api/student-attendance/records?eventId=&teamId=&sessionName=
router.get(
  "/records",
  protect,
  delegate("getStudentAttendanceRecords", controller.getAttendanceRecords),
);

// Event Manager: list submissions for an event (pending/approved/rejected)
// GET /api/student-attendance/manager/submissions?eventId=&status=pending
router.get(
  "/manager/submissions",
  protect,
  delegate("getManagerStudentAttendance", controller.getManagerSubmissions),
);

module.exports = router;
