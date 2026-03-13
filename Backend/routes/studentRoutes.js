const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");

const { delegate } = require("../engine/router");
const { protect, identifyUser } = require("../middleware/auth");

// GET /api/students/search?q=99
router.get(
  "/search",
  delegate("searchStudents", studentController.searchStudents),
);

// GET /api/students/deleted
router.get(
  "/deleted",
  identifyUser,
  delegate(
    "getDeletedRegistrations",
    studentController.getDeletedRegistrations,
  ),
);

// GET /api/students/:regno
router.get(
  "/:regno",
  delegate("getStudentByRegNo", studentController.getStudentByRegNo),
);

// POST /api/students
router.post("/", delegate("createStudent", studentController.createStudent));

// POST /api/students/bulk
router.post(
  "/bulk",
  delegate("createStudentsBulk", studentController.createStudentsBulk),
);

// PUT /api/students/:regno
router.put(
  "/:regno",
  delegate("updateStudent", studentController.updateStudent),
);

// POST /api/students/soft-delete
router.post(
  "/soft-delete",
  identifyUser,
  delegate("softDeleteRegistration", studentController.softDeleteRegistration),
);

// POST /api/students/undo-delete
router.post(
  "/undo-delete",
  identifyUser,
  delegate("undoDeleteRegistration", studentController.undoDeleteRegistration),
);

// DELETE /api/students/permanent-delete
router.delete(
  "/permanent-delete",
  identifyUser,
  delegate(
    "permanentDeleteRegistration",
    studentController.permanentDeleteRegistration,
  ),
);

// GET /api/students/deleted
router.get(
  "/deleted",
  identifyUser,
  delegate(
    "getDeletedRegistrations",
    studentController.getDeletedRegistrations,
  ),
);

module.exports = router;
