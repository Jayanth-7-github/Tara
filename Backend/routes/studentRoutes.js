const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");

// GET /api/students/search?q=99
router.get("/search", studentController.searchStudents);

// GET /api/students/:regno
router.get("/:regno", studentController.getStudentByRegNo);

// POST /api/students
router.post("/", studentController.createStudent);

// POST /api/students/bulk
router.post("/bulk", studentController.createStudentsBulk);

module.exports = router;
