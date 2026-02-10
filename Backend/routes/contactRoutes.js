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

const { delegate } = require("../engine/router");

// Send contact message (requires authentication)
router.post("/", protect, delegate('sendContactMessage', sendContactMessage));

// Get contacts for events managed by logged-in user
router.get("/my-contacts", protect, delegate('getMyContacts', getMyContacts));

// Get contact requests created by the logged-in user (their interests)
router.get("/my-requests", protect, delegate('getMyContactRequests', getMyRequests));

// Update contact status (mark as read/handled)
router.put("/:id/status", protect, delegate('updateContactStatus', updateContactStatus));

// Approve contact request (allows user to register)
router.put("/:id/approve", protect, delegate('approveContact', approveContact));

// Reject contact request
router.put("/:id/reject", protect, delegate('rejectContact', rejectContact));

// Add contact as student for the event
router.post("/:id/add-student", protect, delegate('addContactAsStudent', addContactAsStudent));

module.exports = router;
