const express = require("express");
const router = express.Router();
const rolesController = require("../controllers/rolesController");
const { protect } = require("../middleware/auth");

// Public read
router.get("/", rolesController.getRoles);

// Update (admin only) - requires authentication and admin role
const { requireAdmin } = require("../middleware/auth");
router.post("/", protect, requireAdmin, rolesController.upsertRoles);

module.exports = router;
