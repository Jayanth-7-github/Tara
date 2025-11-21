const express = require("express");
const router = express.Router();
const {
  sendContactMessage,
  getMyContacts,
  updateContactStatus,
  addContactAsStudent,
} = require("../controllers/contactController");
const { protect } = require("../middleware/auth");

// Send contact message (requires authentication)
router.post("/", protect, sendContactMessage);

// Get contacts for events managed by logged-in user
router.get("/my-contacts", protect, getMyContacts);

// Update contact status (mark as read/handled)
router.put("/:id/status", protect, updateContactStatus);

// Add contact as student for the event
router.post("/:id/add-student", protect, addContactAsStudent);

module.exports = router;
