const RoleConfig = require("../models/RoleConfig");

// Return current roles mapping (admins/students)
exports.getRoles = async (req, res) => {
  try {
    // Basic user filtering: only admins/members see the full config
    const role = (req.user && req.user.role) || "user";
    if (role !== "admin" && role !== "member") {
      return res.json({
        admins: [],
        students: [],
        members: [],
        studentsByEvent: {},
        eventManagersByEvent: {},
      });
    }

    const doc = await RoleConfig.findOne().lean();
    if (!doc)
      return res.json({
        admins: [],
        students: [],
        members: [],
        studentsByEvent: {},
        eventManagersByEvent: {},
      });

    // Convert Maps (if present) to plain objects for easy client consumption
    const studentsByEvent =
      doc.studentsByEvent && typeof doc.studentsByEvent === "object"
        ? doc.studentsByEvent instanceof Map
          ? Object.fromEntries(doc.studentsByEvent)
          : doc.studentsByEvent
        : {};

    const eventManagersByEvent =
      doc.eventManagersByEvent && typeof doc.eventManagersByEvent === "object"
        ? doc.eventManagersByEvent instanceof Map
          ? Object.fromEntries(doc.eventManagersByEvent)
          : doc.eventManagersByEvent
        : {};

    return res.json({
      admins: doc.admins || [],
      students: doc.students || [],
      members: doc.members || [],
      studentsByEvent,
      eventManagersByEvent,
    });
  } catch (err) {
    console.error("getRoles error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Upsert roles mapping. Expect body: { admins: [..], students: [..] }
// This endpoint should be protected by admin middleware (done in routes).
exports.upsertRoles = async (req, res) => {
  try {
    const {
      admins,
      students,
      members,
      eventManagers,
      eventId,
      eventTitle,
      eventName,
    } = req.body || {};

    // Helper to normalize an input that may be an array, a single string,
    // or a comma/space separated list. We treat all identifiers as regnos
    // (uppercase) because "only regno is enough" per user request.
    const normalizeToRegnos = (input) => {
      if (!input && input !== 0) return [];
      // If array, flatten and convert
      if (Array.isArray(input)) {
        return input.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
      }
      // If a single string, split on commas or whitespace
      const str = String(input);
      // allow comma-separated or space-separated values
      const parts = str.includes(",") ? str.split(",") : str.split(/\s+/);
      return parts.map((p) => String(p).trim().toUpperCase()).filter(Boolean);
    };

    const adminsArr = normalizeToRegnos(admins);
    const studentsArr = normalizeToRegnos(students);
    const membersArr = normalizeToRegnos(members);
    // Normalize event managers (emails) - accept arrays or comma/space separated strings
    const normalizeManagers = (input) => {
      if (!input && input !== 0) return [];
      if (Array.isArray(input))
        return input.map((s) => String(s).trim().toLowerCase()).filter(Boolean);
      const str = String(input);
      const parts = str.includes(",") ? str.split(",") : str.split(/\s+/);
      return parts.map((p) => String(p).trim().toLowerCase()).filter(Boolean);
    };
    const eventManagersArr = normalizeManagers(eventManagers);

    let doc = await RoleConfig.findOne();
    if (!doc) {
      // If no document exists, create one with the provided arrays (may be empty)
      doc = await RoleConfig.create({
        admins: adminsArr,
        students: [],
        studentsByEvent: {},
      });
    }

    // If an eventName (or eventTitle) is provided, update per-event maps (merge behavior)
    const eventKeyRaw = eventName || eventTitle || eventId;
    if (eventKeyRaw) {
      const evKey = String(eventKeyRaw).trim();

      // Admins are global: merge any provided admin regnos into the global admins list
      if (adminsArr && adminsArr.length > 0) {
        const existingAdmins = Array.isArray(doc.admins) ? doc.admins : [];
        const mergedAdmins = Array.from(
          new Set(existingAdmins.concat(adminsArr))
        );
        doc.admins = mergedAdmins;
      }

      // Merge students into studentsByEvent if provided
      if (studentsArr && studentsArr.length > 0) {
        if (!doc.studentsByEvent) doc.studentsByEvent = {};
        if (
          doc.studentsByEvent &&
          typeof doc.studentsByEvent.get === "function"
        ) {
          const existing = doc.studentsByEvent.get(evKey) || [];
          const merged = Array.from(
            new Set((existing || []).concat(studentsArr))
          );
          doc.studentsByEvent.set(evKey, merged);
        } else {
          const existing = Array.isArray(doc.studentsByEvent[evKey])
            ? doc.studentsByEvent[evKey]
            : [];
          const merged = Array.from(new Set(existing.concat(studentsArr)));
          doc.studentsByEvent = doc.studentsByEvent || {};
          doc.studentsByEvent[evKey] = merged;
        }
      }

      // Merge eventManagers into eventManagersByEvent if provided
      if (eventManagersArr && eventManagersArr.length > 0) {
        if (!doc.eventManagersByEvent) doc.eventManagersByEvent = {};
        if (
          doc.eventManagersByEvent &&
          typeof doc.eventManagersByEvent.get === "function"
        ) {
          const existing = doc.eventManagersByEvent.get(evKey) || [];
          const merged = Array.from(
            new Set((existing || []).concat(eventManagersArr))
          );
          doc.eventManagersByEvent.set(evKey, merged);
        } else {
          const existing = Array.isArray(doc.eventManagersByEvent[evKey])
            ? doc.eventManagersByEvent[evKey]
            : [];
          const merged = Array.from(new Set(existing.concat(eventManagersArr)));
          doc.eventManagersByEvent = doc.eventManagersByEvent || {};
          doc.eventManagersByEvent[evKey] = merged;
        }
      }

      await doc.save();
    } else {
      // No event key: update global lists (legacy behavior)
      // Merge behavior: only add new entries if provided; do not replace with empty arrays
      if (adminsArr && adminsArr.length > 0) {
        const existing = Array.isArray(doc.admins) ? doc.admins : [];
        const merged = Array.from(new Set(existing.concat(adminsArr)));
        doc.admins = merged;
      }
      if (studentsArr && studentsArr.length > 0) {
        const existing = Array.isArray(doc.students) ? doc.students : [];
        const merged = Array.from(new Set(existing.concat(studentsArr)));
        doc.students = merged;
      }
      if (membersArr && membersArr.length > 0) {
        const existing = Array.isArray(doc.members) ? doc.members : [];
        const merged = Array.from(new Set(existing.concat(membersArr)));
        doc.members = merged;
      }
      await doc.save();
    }

    return res.json({ admins: doc.admins, students: doc.students });
  } catch (err) {
    console.error("upsertRoles error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
