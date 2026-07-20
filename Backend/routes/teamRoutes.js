const express = require("express");
const router = express.Router();
const {
  createTeam,
  getTeams,
  getTeamProblemStatements,
  selectTeamProblemStatement,
  resetTeamProblemStatement,
  getTeamById,
  uploadTeamAvatar,
} = require("../controllers/teamController");
const { protect } = require("../middleware/auth");

// POST /api/teams - create a team for an event
router.post("/", createTeam);
router.get("/", getTeams);
router.get("/:teamId", protect, getTeamById);
router.get("/:teamId/problem-statements", protect, getTeamProblemStatements);
router.post(
  "/:teamId/problem-statement-selection",
  protect,
  selectTeamProblemStatement,
);
router.patch(
  "/:teamId/problem-statement-selection/reset",
  protect,
  resetTeamProblemStatement,
);
router.patch(
  "/:teamId/avatar",
  protect,
  uploadTeamAvatar,
);

module.exports = router;
