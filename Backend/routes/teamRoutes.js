const express = require("express");
const router = express.Router();
const { createTeam, getTeams } = require("../controllers/teamController");

// POST /api/teams - create a team for an event
router.post("/", createTeam);
router.get("/", getTeams);

module.exports = router;
