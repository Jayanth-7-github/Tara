const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");

const { delegate } = require("../engine/router");

// GET /api/students/search?q=99
router.get("/search", delegate('searchStudents', studentController.searchStudents));

// GET /api/students/:regno
router.get("/:regno", delegate('getStudentByRegNo', studentController.getStudentByRegNo));

// POST /api/students
router.post("/", delegate('createStudent', studentController.createStudent));

// POST /api/students/bulk
router.post("/bulk", delegate('createStudentsBulk', studentController.createStudentsBulk));

module.exports = router;
