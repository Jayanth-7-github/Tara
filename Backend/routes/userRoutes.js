const express = require("express");
const {
  startGoogleAuth,
  handleGoogleCallback,
} = require("../controllers/authController");

const router = express.Router();

// Start Google OAuth flow
router.get("/google", startGoogleAuth);

// Google OAuth callback
router.get("/google/callback", handleGoogleCallback);

module.exports = router;
