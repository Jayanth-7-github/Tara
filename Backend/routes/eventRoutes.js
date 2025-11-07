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

// POST /api/events -> create a new event
router.post("/", createEvent);

// GET /api/events -> list events
router.get("/", getEvents);

// GET /api/events/:id/image -> stream image for event
router.get("/:id/image", getEventImage);

// POST /api/events/:id/register -> register
router.post("/:id/register", registerEvent);

// PUT /api/events/:id -> update event
router.put("/:id", updateEvent);

// DELETE /api/events/:id -> delete event
router.delete("/:id", deleteEvent);

module.exports = router;
