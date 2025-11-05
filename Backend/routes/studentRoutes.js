const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");

// GET /api/students/:regno
router.get("/:regno", studentController.getStudentByRegNo);

module.exports = router;
