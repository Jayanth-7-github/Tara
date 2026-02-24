const express = require("express");
const router = express.Router();
const {
  sendContactMessage,
  getMyContacts,
  getMyRequests,
  getOrganizerApplications,
  updateContactStatus,
  addContactAsStudent,
  approveContact,
  rejectContact,
  promoteToMember,
} = require("../controllers/contactController");
const { protect, requireAdmin } = require("../middleware/auth");

const { delegate } = require("../engine/router");

// Send contact message (no login required)
router.post("/", delegate('sendContactMessage', sendContactMessage));

// Get contacts for events managed by logged-in user
router.get("/my-contacts", protect, delegate('getMyContacts', getMyContacts));

// Get all organizer applications (admin only)
router.get("/organizer-applications", protect, requireAdmin, delegate('getOrganizerApplications', getOrganizerApplications));

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

// Promote contact user to member
router.post("/:id/promote-member", protect, requireAdmin, delegate('promoteToMember', promoteToMember));

module.exports = router;
