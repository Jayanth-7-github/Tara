const path = require("path");
const Event = require(path.join(__dirname, "..", "models", "Event"));
const Contact = require(path.join(__dirname, "..", "models", "Contact"));
const User = require(path.join(__dirname, "..", "models", "User"));
const RoleConfig = require(path.join(__dirname, "..", "models", "RoleConfig"));
const Student = require(path.join(__dirname, "..", "models", "Student"));

// POST /api/contact
// body: { name, regno, email, branch, college, message, eventId }
// Saves contact message to database instead of sending email
async function sendContactMessage(req, res) {
  try {
    const { name, regno, email, branch, college, message, eventId } =
      req.body || {};

    // If user is authenticated, prefer their profile values when fields missing
    let actorEmail = email;
    let actorName = name;
    let userId = null;
    if (req.user && req.user.id) {
      try {
        const user = await User.findById(req.user.id).lean();
        if (user) {
          userId = user._id;
          actorEmail = actorEmail || user.email;
          actorName = actorName || user.name || user.regno || actorEmail;
        }
      } catch (e) {
        // ignore
      }
    }

    // require minimal fields
    if (!actorName || !actorEmail)
      return res.status(400).json({ error: "Missing name or email" });

    if (!eventId) return res.status(400).json({ error: "Missing eventId" });

    // Determine recipient email and event title
    let recipient = null;
    let eventTitle = "event";
    let event = null;

    try {
      event = await Event.findById(eventId).lean();
      if (!event) return res.status(404).json({ error: "Event not found" });

      eventTitle = event.title || eventTitle;
      if (event.managerEmail) recipient = event.managerEmail;
    } catch (e) {
      return res.status(500).json({ error: "Failed to fetch event" });
    }

    // Save contact message to database
    const contactData = {
      eventId,
      eventTitle,
      name: actorName,
      regno: regno || undefined,
      email: actorEmail,
      branch: branch || undefined,
      college: college || undefined,
      message: message || undefined,
      recipientEmail: recipient,
      userId: userId || undefined,
      status: "unread",
    };

    const contact = await Contact.create(contactData);
    return res.json({ success: true, contactId: contact._id });
  } catch (err) {
    console.error("sendContactMessage error", err);
    return res.status(500).json({ error: "Failed to save contact message" });
  }
}

// GET /api/contact/my-contacts
// Returns contacts for events managed by the logged-in user
async function getMyContacts(req, res) {
  try {
    if (!req.user || !req.user.id)
      return res.status(401).json({ error: "Unauthorized" });

    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    const userEmail = user.email
      ? String(user.email).toLowerCase().trim()
      : null;
    const isAdmin = user.role === "admin";

    // Fetch all events this user manages
    let managedEventIds = [];

    if (isAdmin) {
      // Admins see all contacts
      const allEvents = await Event.find().select("_id").lean();
      managedEventIds = allEvents.map((e) => e._id);
    } else {
      // Find events where user is manager
      const events = await Event.find().lean();

      // Also check RoleConfig for per-event managers
      const rc = await RoleConfig.findOne().lean();

      for (const ev of events) {
        let isManager = false;

        // Check direct managerEmail
        if (
          userEmail &&
          ev.managerEmail &&
          String(ev.managerEmail).toLowerCase().trim() === userEmail
        ) {
          isManager = true;
        }

        // Check RoleConfig eventManagersByEvent
        if (!isManager && rc && rc.eventManagersByEvent) {
          const key = ev.title || ev._id.toString();
          let managers = [];
          if (rc.eventManagersByEvent instanceof Map)
            managers = rc.eventManagersByEvent.get(key) || [];
          else managers = rc.eventManagersByEvent[key] || [];

          const normalized = (managers || []).map((m) =>
            String(m).toLowerCase()
          );
          if (userEmail && normalized.includes(userEmail)) {
            isManager = true;
          }
        }

        if (isManager) managedEventIds.push(ev._id);
      }
    }

    if (managedEventIds.length === 0) {
      return res.json({ contacts: [] });
    }

    // Fetch contacts for managed events
    const contacts = await Contact.find({
      eventId: { $in: managedEventIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ contacts });
  } catch (err) {
    console.error("getMyContacts error", err);
    return res.status(500).json({ error: "Failed to fetch contacts" });
  }
}

// PUT /api/contact/:id/status
// Update contact status (mark as read/handled)
async function updateContactStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!["unread", "read", "handled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    if (!req.user || !req.user.id)
      return res.status(401).json({ error: "Unauthorized" });

    const contact = await Contact.findById(id);
    if (!contact) return res.status(404).json({ error: "Contact not found" });

    // Verify user has permission (admin or event manager)
    const user = await User.findById(req.user.id).lean();
    const isAdmin = user && user.role === "admin";
    const userEmail =
      user && user.email ? String(user.email).toLowerCase().trim() : null;

    if (!isAdmin) {
      // Check if user manages this event
      const event = await Event.findById(contact.eventId).lean();
      if (!event) return res.status(404).json({ error: "Event not found" });

      let isManager = false;
      if (
        userEmail &&
        event.managerEmail &&
        String(event.managerEmail).toLowerCase().trim() === userEmail
      ) {
        isManager = true;
      }

      if (!isManager) {
        const rc = await RoleConfig.findOne().lean();
        const key = event.title || event._id.toString();
        let managers = [];
        if (rc && rc.eventManagersByEvent) {
          if (rc.eventManagersByEvent instanceof Map)
            managers = rc.eventManagersByEvent.get(key) || [];
          else managers = rc.eventManagersByEvent[key] || [];
        }
        const normalized = (managers || []).map((m) => String(m).toLowerCase());
        if (userEmail && normalized.includes(userEmail)) {
          isManager = true;
        }
      }

      if (!isManager) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    contact.status = status;
    await contact.save();

    return res.json({ success: true, contact });
  } catch (err) {
    console.error("updateContactStatus error", err);
    return res.status(500).json({ error: "Failed to update contact status" });
  }
}

// POST /api/contact/:id/add-student
// Add contact as a student for the event
async function addContactAsStudent(req, res) {
  try {
    const { id } = req.params;

    if (!req.user || !req.user.id)
      return res.status(401).json({ error: "Unauthorized" });

    // Find the contact
    const contact = await Contact.findById(id);
    if (!contact) return res.status(404).json({ error: "Contact not found" });

    // Verify permission (must be event manager for this event)
    const event = await Event.findById(contact.eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const user = await User.findById(req.user.id).lean();
    const isAdmin = user && user.role === "admin";
    const userEmail =
      user && user.email ? String(user.email).toLowerCase().trim() : null;

    // Check if user is the event manager
    let isManager = false;
    if (
      userEmail &&
      event.managerEmail &&
      String(event.managerEmail).toLowerCase().trim() === userEmail
    ) {
      isManager = true;
    }

    if (!isManager && !isAdmin) {
      // Check if user is in eventManagersByEvent for this event
      const rc = await RoleConfig.findOne().lean();
      const key = event.title || event._id.toString();
      let managers = [];
      if (rc && rc.eventManagersByEvent) {
        if (rc.eventManagersByEvent instanceof Map)
          managers = rc.eventManagersByEvent.get(key) || [];
        else managers = rc.eventManagersByEvent[key] || [];
      }
      const normalized = (managers || []).map((m) => String(m).toLowerCase());
      if (userEmail && normalized.includes(userEmail)) {
        isManager = true;
      }
    }

    if (!isManager && !isAdmin) {
      return res
        .status(403)
        .json({ error: "Not authorized to manage this event" });
    }

    // Validate contact has required student information
    if (!contact.regno || !contact.name) {
      return res
        .status(400)
        .json({
          error: "Contact missing required student information (regno, name)",
        });
    }

    // Check if student already exists
    const existingStudent = await Student.findOne({
      regno: new RegExp(`^${contact.regno}$`, "i"),
    });

    if (existingStudent) {
      // Check if already registered for this event
      const alreadyRegistered = existingStudent.registrations.some(
        (reg) => reg.event.toString() === event._id.toString()
      );

      if (alreadyRegistered) {
        return res.status(409).json({
          error: "Student is already registered for this event",
        });
      }

      // Add registration to existing student
      existingStudent.registrations.push({
        event: event._id,
        eventName: event.title,
        registeredAt: new Date(),
      });
      await existingStudent.save();

      // Update event registered count
      event.registeredCount = (event.registeredCount || 0) + 1;
      await event.save();

      // Update contact status to handled
      contact.status = "handled";
      await contact.save();

      return res.json({
        message: "Student registered for event successfully",
        student: existingStudent,
      });
    }

    // Create new student with event registration
    const newStudent = await Student.create({
      regno: contact.regno,
      name: contact.name,
      department: contact.branch,
      college: contact.college,
      email: contact.email,
      registrations: [
        {
          event: event._id,
          eventName: event.title,
          registeredAt: new Date(),
        },
      ],
    });

    // Update event registered count
    event.registeredCount = (event.registeredCount || 0) + 1;
    await event.save();

    // Update contact status to handled
    contact.status = "handled";
    await contact.save();

    return res.json({
      message: "Student created and registered for event successfully",
      student: newStudent,
    });
  } catch (err) {
    console.error("addContactAsStudent error", err);
    if (err.code === 11000) {
      return res
        .status(409)
        .json({
          error: "Student with this registration number already exists",
        });
    }
    return res.status(500).json({ error: "Failed to add student" });
  }
}

module.exports = {
  sendContactMessage,
  getMyContacts,
  updateContactStatus,
  addContactAsStudent,
};
