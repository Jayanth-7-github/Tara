const express = require("express");
const router = express.Router();
const {
  sendContactMessage,
  getMyContacts,
  getMyRequests,
  updateContactStatus,
  addContactAsStudent,
  approveContact,
  rejectContact,
} = require("../controllers/contactController");
const { protect } = require("../middleware/auth");

// Send contact message (requires authentication)
router.post("/", protect, sendContactMessage);

// Get contacts for events managed by logged-in user
router.get("/my-contacts", protect, getMyContacts);

// Get contact requests created by the logged-in user (their interests)
router.get("/my-requests", protect, getMyRequests);

// Update contact status (mark as read/handled)
router.put("/:id/status", protect, updateContactStatus);

// Approve contact request (allows user to register)
router.put("/:id/approve", protect, approveContact);

// Reject contact request
router.put("/:id/reject", protect, rejectContact);

// Add contact as student for the event
router.post("/:id/add-student", protect, addContactAsStudent);

module.exports = router;
