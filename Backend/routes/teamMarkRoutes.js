const express = require("express");

const router = express.Router();

const controller = require("../controllers/teamMarkController");
const { protect } = require("../middleware/auth");

router.get("/", protect, controller.listTeamMarks);
router.post("/", protect, controller.upsertTeamMark);
router.delete("/:id", protect, controller.deleteTeamMark);

module.exports = router;
