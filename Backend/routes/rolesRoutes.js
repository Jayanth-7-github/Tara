const express = require("express");
const router = express.Router();
const rolesController = require("../controllers/rolesController");
const { protect } = require("../middleware/auth");

const { delegate } = require("../engine/router");

// Public read - now protected
router.get("/", protect, delegate('getRoles', rolesController.getRoles));

// Update (admin only) - requires authentication and admin role
const { requireAdmin } = require("../middleware/auth");
router.post("/", protect, requireAdmin, delegate('upsertRoles', rolesController.upsertRoles));

module.exports = router;
