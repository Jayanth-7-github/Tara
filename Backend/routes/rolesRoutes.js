const express = require("express");
const router = express.Router();
const rolesController = require("../controllers/rolesController");
const { protect } = require("../middleware/auth");

// Public read
router.get("/", rolesController.getRoles);

// Update (admin only) - requires authentication; controller checks admin role
router.post("/", protect, rolesController.upsertRoles);

module.exports = router;
