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
const { protect, identifyUser } = require("../middleware/auth");

const { delegate } = require("../engine/router");

// POST /api/events -> create a new event (authenticated)
router.post("/", protect, delegate('createEvent', createEvent));

// GET /api/events -> list events (optionally authenticated to see extra details)
router.get("/", identifyUser, delegate('getEvents', getEvents));

// GET /api/events/:id/image -> stream image for event
router.get("/:id/image", delegate('getEventImage', getEventImage));

// POST /api/events/:id/register -> register
router.post("/:id/register", delegate('registerEvent', registerEvent));

// PUT /api/events/:id -> update event (authenticated or with secret token)
router.put("/:id", identifyUser, delegate('updateEvent', updateEvent));

// DELETE /api/events/:id -> delete event (authenticated)
router.delete("/:id", protect, delegate('deleteEvent', deleteEvent));

module.exports = router;
