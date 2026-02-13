const Event = require("../models/Event");
const Student = require("../models/Student");
const RoleConfig = require("../models/RoleConfig");
const User = require("../models/User");

/**
 * Create a new event.
 * Expects JSON body: { title, description?, venue, date (ISO string), managerEmail, imageUrl }
 */
async function createEvent(req, res) {
  try {
    const {
      title,
      description,
      venue,
      date,
      price,
      imageUrl,
      imageBase64,
      imageType,
      isTestEnabled,
      sessions,
    } = req.body;
    let managerEmail = req.body.managerEmail;

    if (!title || !date || !managerEmail) {
      return res.status(400).json({
        error: "Missing required fields: title, date and managerEmail",
      });
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    // Normalize price: optional, non-negative number; 0 or missing means free.
    let normalizedPrice = 0;
    if (price !== undefined && price !== null && price !== "") {
      const parsedPrice = Number(price);
      if (!Number.isNaN(parsedPrice) && parsedPrice >= 0) {
        normalizedPrice = parsedPrice;
      }
    }

    // basic email validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(String(managerEmail))) {
      return res.status(400).json({ error: "Invalid managerEmail format" });
    }

    // Permission: only admins or the user who is creating the event as their own manager can create.
    let actor = null;
    if (req.user && req.user.id)
      actor = await User.findById(req.user.id).lean();
    const isAdmin = actor && actor.role === "admin";
    // Determine if actor is in the global 'members' list (RoleConfig) so we can
    // treat them as an event manager on create even if their stored User.role
    // hasn't been reconciled yet.
    let isMember = false;
    try {
      const rcCheck = await RoleConfig.findOne().lean();
      const membersList =
        rcCheck && Array.isArray(rcCheck.members) ? rcCheck.members : [];
      const actorRegno =
        actor && actor.regno ? String(actor.regno).toUpperCase() : null;
      const actorEmail =
        actor && actor.email ? String(actor.email).toLowerCase() : null;
      if (
        actorRegno &&
        membersList.map((m) => String(m).toUpperCase()).includes(actorRegno)
      )
        isMember = true;
      if (
        !isMember &&
        actorEmail &&
        membersList.map((m) => String(m).toLowerCase()).includes(actorEmail)
      )
        isMember = true;
    } catch (e) {
      // ignore
    }

    // If not admin, enforce managerEmail equals logged-in user's email; if not provided, set it to user's email
    if (!isAdmin) {
      const userEmail =
        actor && actor.email ? String(actor.email).toLowerCase().trim() : null;
      if (!userEmail) return res.status(403).json({ error: "Forbidden" });
      if (
        managerEmail &&
        String(managerEmail).toLowerCase().trim() !== userEmail
      ) {
        return res.status(403).json({
          error: "Non-admin users can only create events for themselves",
        });
      }
      // ensure managerEmail set to user's email
      managerEmail = userEmail;
    }

    const ev = new Event({
      title,
      description,
      venue,
      date: parsedDate,
      price: normalizedPrice,
      managerEmail: String(managerEmail).toLowerCase().trim(),
      isTestEnabled: isTestEnabled !== undefined ? isTestEnabled : false,
      sessions: sessions || [],
    });

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

    // If the creator is a 'member' (according to RoleConfig) or an admin,
    // add them as an event manager for this specific event. This ensures
    // admins who create events are recorded as per-event managers as well.
    try {
      if (actor && (isMember || isAdmin)) {
        const rc = await RoleConfig.findOne();
        const managerEmailNormalized = String(actor.email || "")
          .toLowerCase()
          .trim();
        // Use the event title as the per-event key to match how studentsByEvent is stored
        // Fall back to _id if title is missing
        const evKey =
          (ev.title && String(ev.title).trim()) || ev._id.toString();
        if (!rc) {
          const newRc = new RoleConfig();
          if (!newRc.eventManagersByEvent) newRc.eventManagersByEvent = {};
          if (typeof newRc.eventManagersByEvent.set === "function") {
            newRc.eventManagersByEvent.set(evKey, [managerEmailNormalized]);
          } else {
            newRc.eventManagersByEvent = newRc.eventManagersByEvent || {};
            newRc.eventManagersByEvent[evKey] = [managerEmailNormalized];
          }
          await newRc.save();
        } else {
          // merge into existing list
          if (!rc.eventManagersByEvent) rc.eventManagersByEvent = {};
          if (typeof rc.eventManagersByEvent.get === "function") {
            const existing = rc.eventManagersByEvent.get(evKey) || [];
            const merged = Array.from(
              new Set((existing || []).concat([managerEmailNormalized])),
            );
            rc.eventManagersByEvent.set(evKey, merged);
          } else {
            const existing = Array.isArray(rc.eventManagersByEvent[evKey])
              ? rc.eventManagersByEvent[evKey]
              : [];
            const merged = Array.from(
              new Set(existing.concat([managerEmailNormalized])),
            );
            rc.eventManagersByEvent = rc.eventManagersByEvent || {};
            rc.eventManagersByEvent[evKey] = merged;
          }
          await rc.save();
        }
      }
    } catch (rcErr) {
      // Log but don't fail event creation if role config update fails
      console.error("Failed to persist event manager in RoleConfig:", rcErr);
    }

    return res.status(201).json({ event: ev });
  } catch (err) {
    console.error("createEvent error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Get list of events, sorted by date ascending.
 * If authenticated as admin or event manager, includes `registeredStudents` list.
 */
async function getEvents(req, res) {
  try {
    // exclude raw image binary to keep response small; frontend can request image separately
    const events = await Event.find()
      .select("-image.data")
      .sort({ date: 1 })
      .lean();

    // Check if user is authenticated via identifyUser middleware
    let actor = null;
    if (req.user && req.user.id) {
      // Import User model if not top-level, but it is top-level.
      actor = await User.findById(req.user.id).lean();
    }

    const isAdmin = actor && actor.role === "admin";
    const userEmail = actor && actor.email ? String(actor.email).toLowerCase().trim() : null;

    // Identify events that need population
    const eventsToPopulate = new Set();

    if (isAdmin) {
      // Admin sees requests for ALL events
      events.forEach(e => eventsToPopulate.add(e._id.toString()));
    } else if (userEmail) {
      // Manager sees requests for their events
      // Also strictly check role config if needed, but managerEmail is primary
      events.forEach(e => {
        if (e.managerEmail && String(e.managerEmail).toLowerCase().trim() === userEmail) {
          eventsToPopulate.add(e._id.toString());
        }
      });

      // Also check RoleConfig for delegated managers (optional but consistent)
      try {
        const rc = await RoleConfig.findOne().lean();
        if (rc && rc.eventManagersByEvent) {
          events.forEach(e => {
            const key = (e.title || "").trim() || e._id.toString();
            let managers = [];
            if (rc.eventManagersByEvent instanceof Map || typeof rc.eventManagersByEvent.get === 'function') {
              // handled by mongoose map logic usually as object in lean() unless Map type
              // simpler: just check object keys
            }
            // In lean(), Maps are usually POJO if schema type is Map
            // But let's check basic structure
            const mapVal = rc.eventManagersByEvent[key]; // direct access
            if (Array.isArray(mapVal)) managers = mapVal;

            const normManagers = managers.map(m => String(m).toLowerCase());
            if (normManagers.includes(userEmail)) {
              eventsToPopulate.add(e._id.toString());
            }
          });
        }
      } catch (e) { /* ignore role check fail */ }
    }

    if (eventsToPopulate.size > 0) {
      const studentFields = "name regno email department college year registrations";
      const students = await Student.find({
        "registrations.event": { $in: Array.from(eventsToPopulate) }
      }).select(studentFields).lean();

      const studentsByEvent = {};

      students.forEach(s => {
        if (s.registrations && Array.isArray(s.registrations)) {
          s.registrations.forEach(r => {
            const eId = r.event ? r.event.toString() : null;
            if (eId && eventsToPopulate.has(eId)) {
              if (!studentsByEvent[eId]) studentsByEvent[eId] = [];
              studentsByEvent[eId].push({
                _id: s._id,
                name: s.name,
                regno: s.regno,
                email: s.email,
                department: s.department,
                college: s.college,
                year: s.year,
                registeredAt: r.registeredAt
              });
            }
          });
        }
      });

      // Attach data
      events.forEach(e => {
        if (eventsToPopulate.has(e._id.toString())) {
          e.registeredStudents = studentsByEvent[e._id.toString()] || [];
        }
      });
    }

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
        ev.image.contentType || "application/octet-stream",
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
      (r) => r.event && r.event.toString() === ev._id.toString(),
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
        incErr,
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
      managerEmail,
      price,
      imageBase64,
      imageType,
      imageUrl,
      isTestEnabled,
      questions,
      sessions,
    } = req.body || {};

    const ev = await Event.findById(id);
    if (!ev) return res.status(404).json({ error: "Event not found" });

    // Permission: only admins or the event manager (or configured per-event managers) can update
    let actor = null;
    let isAdmin = false;

    // Secret token bypass
    const secretToken = req.headers["x-admin-token"];
    if (secretToken === "tara1543") {
      isAdmin = true;
    } else {
      if (req.user && req.user.id)
        actor = await User.findById(req.user.id).lean();
      isAdmin = actor && actor.role === "admin";

      if (!isAdmin) {
        const userEmail =
          actor && actor.email ? String(actor.email).toLowerCase().trim() : null;
        // check direct manager match
        if (
          userEmail &&
          ev.managerEmail &&
          String(ev.managerEmail).toLowerCase().trim() === userEmail
        ) {
          // allowed
        } else {
          // check RoleConfig per-event managers for this event title
          const rc = await RoleConfig.findOne().lean();
          const key = ev.title || ev._id.toString();
          let managers = [];
          if (rc && rc.eventManagersByEvent) {
            if (rc.eventManagersByEvent instanceof Map)
              managers = rc.eventManagersByEvent.get(key) || [];
            else managers = rc.eventManagersByEvent[key] || [];
          }
          const normalized = (managers || []).map((m) => String(m).toLowerCase());
          if (!userEmail || !normalized.includes(userEmail))
            return res.status(403).json({ error: "Forbidden" });
        }
      }
    }

    // Build update object
    const $set = {};
    const $unset = {};

    if (title !== undefined) $set.title = title;
    if (description !== undefined) $set.description = description;
    if (venue !== undefined) $set.venue = venue;
    if (date !== undefined) {
      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime()))
        return res.status(400).json({ error: "Invalid date format" });
      $set.date = parsed;
    }

    if (isTestEnabled !== undefined) $set.isTestEnabled = isTestEnabled;
    if (questions !== undefined) $set.questions = questions;

    if (sessions !== undefined) {
      console.log(`[updateEvent] Updating sessions for ${id}:`, JSON.stringify(sessions));
      $set.sessions = sessions;
    }

    if (managerEmail !== undefined) {
      if (!managerEmail)
        return res.status(400).json({ error: "managerEmail cannot be empty" });
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(String(managerEmail)))
        return res.status(400).json({ error: "Invalid managerEmail format" });
      $set.managerEmail = String(managerEmail).toLowerCase().trim();
    }

    if (imageBase64 && imageType) {
      const matches = imageBase64.match(/^data:(.+);base64,(.*)$/);
      const base64Data = matches ? matches[2] : imageBase64;
      $set.image = {
        data: Buffer.from(base64Data, "base64"),
        contentType: imageType,
      };
      $unset.imageUrl = 1;
    } else if (imageUrl !== undefined) {
      $set.imageUrl = imageUrl || ""; // Ensure it's string
      // Clear binary if it exists
      $unset.image = 1;
    }

    if (price !== undefined) {
      let normalizedPrice = 0;
      if (price !== null && price !== "") {
        const parsedPrice = Number(price);
        if (!Number.isNaN(parsedPrice) && parsedPrice >= 0) {
          normalizedPrice = parsedPrice;
        }
      }
      $set.price = normalizedPrice;
    }

    const updateOps = {};
    if (Object.keys($set).length > 0) updateOps.$set = $set;
    if (Object.keys($unset).length > 0) updateOps.$unset = $unset;

    console.log("[updateEvent] Executing update:", JSON.stringify(updateOps, (k, v) => (k === 'data' ? '<Buffer>' : v)));

    const updatedEvent = await Event.findByIdAndUpdate(id, updateOps, {
      new: true,
      runValidators: true,
    });

    return res.json({ success: true, event: updatedEvent });
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

    // Permission: only admins or the event manager (or configured per-event managers) can delete
    let actor = null;
    if (req.user && req.user.id)
      actor = await User.findById(req.user.id).lean();
    const isAdmin = actor && actor.role === "admin";
    if (!isAdmin) {
      const userEmail =
        actor && actor.email ? String(actor.email).toLowerCase().trim() : null;
      if (
        userEmail &&
        ev.managerEmail &&
        String(ev.managerEmail).toLowerCase().trim() === userEmail
      ) {
        // allowed
      } else {
        const rc = await RoleConfig.findOne().lean();
        const key = ev.title || ev._id.toString();
        let managers = [];
        if (rc && rc.eventManagersByEvent) {
          if (rc.eventManagersByEvent instanceof Map)
            managers = rc.eventManagersByEvent.get(key) || [];
          else managers = rc.eventManagersByEvent[key] || [];
        }
        const normalized = (managers || []).map((m) => String(m).toLowerCase());
        if (!userEmail || !normalized.includes(userEmail))
          return res.status(403).json({ error: "Forbidden" });
      }
    }

    // remove registrations referencing this event from students
    try {
      await Student.updateMany(
        {},
        { $pull: { registrations: { event: ev._id } } },
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
