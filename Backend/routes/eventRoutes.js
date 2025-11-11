const express = require("express");
const router = express.Router();
const {
  createEvent,
  getEvents,
  getEventImage,
  registerEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/eventController");
const { protect } = require("../middleware/auth");

// POST /api/events -> create a new event (authenticated)
router.post("/", protect, createEvent);

// GET /api/events -> list events
router.get("/", getEvents);

// GET /api/events/:id/image -> stream image for event
router.get("/:id/image", getEventImage);

// POST /api/events/:id/register -> register
router.post("/:id/register", registerEvent);

// PUT /api/events/:id -> update event (authenticated)
router.put("/:id", protect, updateEvent);

// DELETE /api/events/:id -> delete event (authenticated)
router.delete("/:id", protect, deleteEvent);

module.exports = router;
