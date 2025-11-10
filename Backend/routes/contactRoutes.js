const express = require("express");
const router = express.Router();
const {
  sendContactEmail,
  smtpVerify,
} = require("../controllers/contactController");
const { protect } = require("../middleware/auth");

// Require authentication so we can send on behalf of the logged-in user
// and attach reply-to automatically.
router.post("/", protect, sendContactEmail);
router.get("/_debug/smtp-verify", protect, smtpVerify);

module.exports = router;
