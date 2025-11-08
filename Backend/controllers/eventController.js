const Event = require("../models/Event");
const Student = require("../models/Student");

/**
 * Create a new event.
 * Expects JSON body: { title, description?, venue, date (ISO string), imageUrl }
 */
async function createEvent(req, res) {
  try {
    const {
      title,
      description,
      venue,
      date,
      imageUrl,
      imageBase64,
      imageType,
    } = req.body;

    if (!title || !date) {
      return res
        .status(400)
        .json({ error: "Missing required fields: title and date" });
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    const ev = new Event({ title, description, venue, date: parsedDate });

    // If frontend uploaded image as base64, store it in MongoDB
    if (imageBase64 && imageType) {
      // strip data URI prefix if present
      const matches = imageBase64.match(/^data:(.+);base64,(.*)$/);
      const base64Data = matches ? matches[2] : imageBase64;
      ev.image = {
        data: Buffer.from(base64Data, "base64"),
        contentType: imageType,
      };
    } else if (imageUrl) {
      // fallback to storing remote URL
      ev.imageUrl = imageUrl;
    }

    await ev.save();

    return res.status(201).json({ event: ev });
  } catch (err) {
    console.error("createEvent error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Get list of events, sorted by date ascending.
 */
async function getEvents(req, res) {
  try {
    // exclude raw image binary to keep response small; frontend can request image separately
    const events = await Event.find()
      .select("-image.data")
      .sort({ date: 1 })
      .lean();
    return res.json({ events });
  } catch (err) {
    console.error("getEvents error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Stream event image binary
 */
async function getEventImage(req, res) {
  try {
    const id = req.params.id;
    // don't use .lean() here so Mongoose returns Buffers/Binary in a predictable form
    const ev = await Event.findById(id);
    if (!ev) return res.status(404).json({ error: "Event not found" });

    if (ev.image && ev.image.data) {
      // ev.image.data can be a Buffer, a BSON Binary, or other typed array depending on how it was stored/retrieved.
      let buf = ev.image.data;

      // If it's a BSON Binary (has _bsontype === 'Binary'), extract the underlying buffer
      if (buf && buf._bsontype === "Binary" && buf.buffer) {
        buf = Buffer.from(buf.buffer);
      }

      // If it's a typed array or has a .buffer (ArrayBuffer), convert to Buffer
      if (!Buffer.isBuffer(buf)) {
        if (buf && buf.buffer) buf = Buffer.from(buf.buffer);
        else buf = Buffer.from(buf);
      }

      res.set(
        "Content-Type",
        ev.image.contentType || "application/octet-stream"
      );
      res.set("Content-Length", buf.length);
      return res.send(buf);
    }

    if (ev.imageUrl) {
      // If only imageUrl is set, redirect to it
      return res.redirect(ev.imageUrl);
    }

    return res.status(404).json({ error: "Image not found for this event" });
  } catch (err) {
    console.error("getEventImage error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Register the current user (or provided payload) for an event.
 * Expects JSON body: { name?, email?, regno? }
 */
async function registerEvent(req, res) {
  try {
    const id = req.params.id;
    const { name, email, regno, branch, college, year } = req.body || {};

    const ev = await Event.findById(id);
    if (!ev) return res.status(404).json({ error: "Event not found" });

    // Ensure we have at least regno or email to identify student
    if (!regno && !email) {
      return res
        .status(400)
        .json({ error: "Missing student identifier (regno or email)" });
    }

    // Find or create/update Student record
    let student = null;
    if (regno) student = await Student.findOne({ regno });
    if (!student && email) student = await Student.findOne({ email });

    if (student) {
      // update any provided fields
      let changed = false;
      if (name && student.name !== name) {
        student.name = name;
        changed = true;
      }
      if (branch && student.department !== branch) {
        student.department = branch;
        changed = true;
      }
      if (college && student.college !== college) {
        student.college = college;
        changed = true;
      }
      if (year && student.year !== year) {
        student.year = year;
        changed = true;
      }
      if (email && student.email !== email) {
        student.email = email;
        changed = true;
      }
      if (changed) await student.save();
    } else {
      // create new student
      const toCreate = { regno, name, email };
      if (branch) toCreate.department = branch;
      if (college) toCreate.college = college;
      if (year) toCreate.year = year;
      // create with only provided fields; Mongoose will enforce required regno/name if missing
      student = await Student.create(toCreate);
    }

    // Check whether the student is already registered for this event
    student.registrations = student.registrations || [];
    const alreadyRegistered = student.registrations.some(
      (r) => r.event && r.event.toString() === ev._id.toString()
    );
    if (alreadyRegistered)
      return res.status(400).json({ error: "Already registered" });

    // Add registration to the student document (normalize registrations to Student collection)
    // store the event title as a denormalized field for easy display
    student.registrations.push({
      event: ev._id,
      eventName: ev.title || "",
      registeredAt: new Date(),
    });
    await student.save();

    // Atomically increment registeredCount on the Event for accurate counting (avoid race conditions)
    try {
      await Event.findByIdAndUpdate(ev._id, { $inc: { registeredCount: 1 } });
    } catch (incErr) {
      // log but don't fail the registration if counter update fails
      console.error(
        "Failed to increment registeredCount for event",
        ev._id,
        incErr
      );
    }

    return res.json({ success: true, student });
  } catch (err) {
    console.error("registerEvent error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Update an event by id
 * Accepts JSON body with any of: { title, description, venue, date, imageBase64, imageType, imageUrl }
 */
async function updateEvent(req, res) {
  try {
    const id = req.params.id;
    const {
      title,
      description,
      venue,
      date,
      imageBase64,
      imageType,
      imageUrl,
    } = req.body || {};

    const ev = await Event.findById(id);
    if (!ev) return res.status(404).json({ error: "Event not found" });

    if (title !== undefined) ev.title = title;
    if (description !== undefined) ev.description = description;
    if (venue !== undefined) ev.venue = venue;
    if (date !== undefined) {
      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime()))
        return res.status(400).json({ error: "Invalid date format" });
      ev.date = parsed;
    }

    // image handling: if imageBase64 provided, store binary. If imageUrl provided (and no base64), use URL and clear binary.
    if (imageBase64 && imageType) {
      const matches = imageBase64.match(/^data:(.+);base64,(.*)$/);
      const base64Data = matches ? matches[2] : imageBase64;
      ev.image = {
        data: Buffer.from(base64Data, "base64"),
        contentType: imageType,
      };
      ev.imageUrl = undefined;
    } else if (imageUrl !== undefined) {
      // explicit imageUrl set (could be null/empty to remove)
      ev.imageUrl = imageUrl || undefined;
      // clear binary if present
      if (ev.image && ev.image.data) ev.image = undefined;
    }

    await ev.save();
    return res.json({ success: true, event: ev });
  } catch (err) {
    console.error("updateEvent error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Delete an event and remove registrations referencing it from Student documents
 */
async function deleteEvent(req, res) {
  try {
    const id = req.params.id;
    const ev = await Event.findById(id);
    if (!ev) return res.status(404).json({ error: "Event not found" });

    // remove registrations referencing this event from students
    try {
      await Student.updateMany(
        {},
        { $pull: { registrations: { event: ev._id } } }
      );
    } catch (pullErr) {
      console.error("Failed to remove registrations from students:", pullErr);
      // continue with delete even if student cleanup fails
    }

    await Event.deleteOne({ _id: ev._id });
    return res.json({ success: true, message: "Event deleted" });
  } catch (err) {
    console.error("deleteEvent error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  createEvent,
  getEvents,
  getEventImage,
  registerEvent,
  updateEvent,
  deleteEvent,
};
