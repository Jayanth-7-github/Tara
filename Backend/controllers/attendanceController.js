const path = require("path");
const Student = require(path.join(__dirname, "..", "models", "Student"));
const Attendance = require(path.join(__dirname, "..", "models", "Attendance"));

// Helper: format date as local "YYYY-MM-DD HH:mm"
function formatLocalYMDHM(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

exports.markAttendance = async (req, res) => {
  const { regno, eventName, sessionName } = req.body || {};
  if (!regno) return res.status(400).json({ error: "regno is required" });

  try {
    // find student in DB (case-insensitive regno)
    const student = await Student.findOne({
      regno: new RegExp(`^${regno}$`, "i"),
    }).lean();
    if (!student)
      return res
        .status(404)
        .json({ error: "No student found for this registration number." });

    const event = (eventName || "default").trim();
    // Don't default to "default" if sessionName is provided but potentially falsy (like 0, though unlikely for string)
    // Just ensure it's a string. If user provided "", use "default".
    const sName = (sessionName && typeof sessionName === 'string' && sessionName.trim()) ? sessionName.trim() : "default";
    const now = new Date();

    // Find the aggregate document for this student and event
    let attendanceDoc = await Attendance.findOne({
      regno: new RegExp(`^${regno}$`, "i"),
      eventName: event,
    });

    if (!attendanceDoc) {
      attendanceDoc = new Attendance({
        regno: student.regno,
        name: student.name,
        eventName: event,
        student: student._id,
        sessions: {}
      });
    }

    // Ensure sessions is initialized correctly for Mongoose Map
    if (!attendanceDoc.sessions) {
      attendanceDoc.sessions = new Map();
    } else if (!(attendanceDoc.sessions instanceof Map)) {
      // If it's a POJO (from old data or mixed schema), convert to Map
      // This is critical if previous saves stored it as Object
      attendanceDoc.sessions = new Map(Object.entries(attendanceDoc.sessions));
    }

    // Get existing session data if any
    const existingSession = attendanceDoc.sessions.get(sName);

    if (existingSession && existingSession.isPresent) {
      // Already marked for this session
      // Just update timestamp slightly if needed, or return same info
      return res.json({
        message: `${student.name} is already marked for ${sName}.`,
        attendance: {
          ...existingSession.toObject ? existingSession.toObject() : existingSession,
          regno: attendanceDoc.regno,
          eventName: attendanceDoc.eventName,
          sessionName: sName,
          timestampText: formatLocalYMDHM(existingSession.timestamp),
          _id: attendanceDoc._id
        },
      });
    }

    // New/Update session entry
    const newSession = {
      sessionName: sName,
      timestamp: now,
      timestampText: formatLocalYMDHM(now),
      isPresent: true
    };

    attendanceDoc.sessions.set(sName, newSession);
    await attendanceDoc.save();

    res.json({
      message: `Attendance marked successfully for ${student.name}.`,
      attendance: {
        ...newSession,
        regno: attendanceDoc.regno,
        eventName: attendanceDoc.eventName,
        sessionName: sName,
        isPresent: true,
        _id: attendanceDoc._id
      },
    });
  } catch (err) {
    console.error("markAttendance error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Check if student has marked attendance
exports.checkAttendance = async (req, res) => {
  try {
    const regnoParam = req.params.regno;
    if (!regnoParam)
      return res.status(400).json({ error: "regno is required" });

    const event = (req.query?.eventName || "default").trim() || "default";

    const attendanceDoc = await Attendance.findOne({
      regno: new RegExp(`^${regnoParam}$`, "i"),
      eventName: event,
    }).lean();

    if (!attendanceDoc || !attendanceDoc.sessions) {
      return res.json({ isMarked: false, isPresent: false, records: [] });
    }

    // Flatten sessions map to array for frontend
    const records = Object.values(attendanceDoc.sessions).map(s => ({
      ...s,
      regno: attendanceDoc.regno,
      eventName: attendanceDoc.eventName,
      student: attendanceDoc.student,
      timestamp: s.timestamp instanceof Date ? s.timestamp.getTime() : s.timestamp,
      // Fallbacks for checkIn/checkOut removed
    }));

    res.json({
      isMarked: records.length > 0,
      records: records,
    });
  } catch (err) {
    console.error("checkAttendance error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const eventFilterRaw = req.query?.eventName;
    const eventFilter =
      typeof eventFilterRaw === "string" && eventFilterRaw.trim()
        ? eventFilterRaw.trim()
        : null;

    const limitRaw = Number(req.query?.limit);
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(limitRaw, 20000))
      : 20000;

    const query = eventFilter ? { eventName: eventFilter } : {};

    // Fetch aggregated documents
    const attendanceDocs = await Attendance.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    // Flatten logic for summary
    const flattenedRecords = [];
    const countsByEvent = {};
    const byEvent = {};

    for (const doc of attendanceDocs) {
      const e = doc.eventName || "default";
      byEvent[e] = (byEvent[e] || 0) + 1; // Count unique students really

      if (!countsByEvent[e]) {
        countsByEvent[e] = {
          totalRecords: 0
        };
      }

      // Iterate sessions for this student
      if (doc.sessions) {
        for (const [sKey, sVal] of Object.entries(doc.sessions)) {
          flattenedRecords.push({
            ...sVal,
            regno: doc.regno,
            name: doc.name,
            eventName: doc.eventName,
            sessionName: sVal.sessionName || sKey,
            _id: doc._id
          });

          // Update counts
          countsByEvent[e].totalRecords++;
        }
      }
    }

    const records = flattenedRecords; // Frontend expects array of records
    res.json({ total: flattenedRecords.length, byEvent, countsByEvent, records });

  } catch (err) {
    console.error("getSummary error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Renamed from exportAttendance to exportCSV per route config
exports.exportCSV = async (req, res) => {
  try {
    const eventName = req.query.eventName;
    const query = eventName ? { eventName } : {};

    // Fetch attendance documents
    const docs = await Attendance.find(query).lean();

    // Fetch event configuration to get session names
    const Event = require(path.join(__dirname, "..", "models", "Event"));
    let sessionNames = [];

    if (eventName) {
      const eventDoc = await Event.findOne({ title: eventName }).lean();
      if (eventDoc && eventDoc.sessions) {
        sessionNames = eventDoc.sessions.map(s => s.name);
      }
    }

    // If no event or no sessions configured, extract unique session names from attendance data
    if (sessionNames.length === 0) {
      const sessionSet = new Set();
      for (const doc of docs) {
        if (doc.sessions) {
          for (const sName of Object.keys(doc.sessions)) {
            sessionSet.add(sName);
          }
        }
      }
      sessionNames = Array.from(sessionSet).sort();
    }

    // Build CSV header
    const headers = ["Roll Number", "Name", "Email", "Hostel", "Event"];
    sessionNames.forEach(sName => {
      headers.push(sName); // Session attendance column
      headers.push(`${sName} - Time`); // Session timestamp column
    });

    const lines = [];
    lines.push(headers.join(","));

    // Group by student (regno)
    const studentMap = {};
    for (const doc of docs) {
      if (!studentMap[doc.regno]) {
        studentMap[doc.regno] = {
          regno: doc.regno,
          name: doc.name,
          eventName: doc.eventName,
          sessions: {}
        };
      }

      // Merge sessions from this document
      if (doc.sessions) {
        for (const [sName, sVal] of Object.entries(doc.sessions)) {
          studentMap[doc.regno].sessions[sName] = sVal;
        }
      }
    }

    // Fetch student details for email and hostel
    const regnos = Object.keys(studentMap);
    const students = await Student.find({
      regno: { $in: regnos }
    }).lean();

    const studentDetailsMap = {};
    students.forEach(s => {
      studentDetailsMap[s.regno] = s;
    });

    // Build CSV rows
    for (const [regno, data] of Object.entries(studentMap)) {
      const studentDetails = studentDetailsMap[regno] || {};
      const row = [
        regno,
        data.name,
        studentDetails.email || "",
        studentDetails.hostelName || "",
        data.eventName
      ];

      // Add session attendance and timestamps
      sessionNames.forEach(sName => {
        const session = data.sessions[sName];
        if (session && session.isPresent) {
          row.push("Present");
          row.push(session.timestampText || formatLocalYMDHM(session.timestamp) || "");
        } else {
          row.push(""); // Not marked
          row.push(""); // No timestamp
        }
      });

      // Escape and add row
      const escaped = row.map(v => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(escaped.join(","));
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="attendance.csv"`);
    res.send(lines.join("\n"));

  } catch (err) {
    console.error("export error", err);
    res.status(500).send("Export failed");
  }
};

// Update: Supports legacy style updates but maps to new schema
exports.updateAttendance = async (req, res) => {
  try {
    const { regno } = req.params;
    const { eventName, sessionName, isPresent } = req.body || {};

    if (!eventName) return res.status(400).json({ error: "eventName is required" });
    const sName = sessionName || "default";

    const doc = await Attendance.findOne({ regno: new RegExp(`^${regno}$`, "i"), eventName });
    if (!doc) return res.status(404).json({ error: "Record not found" });

    // Update session
    if (!doc.sessions) doc.sessions = new Map();

    // Always allow creating a session if updating attendance
    let sess = doc.sessions.get(sName);
    if (!sess) {
      // Create if not exists (allows manual marking from admin panel)
      sess = {
        sessionName: sName,
        timestamp: new Date(),
        timestampText: formatLocalYMDHM(new Date()),
        isPresent: true
      };
    }

    if (isPresent !== undefined) sess.isPresent = isPresent;

    // If unchecking attendance (isPresent=false), technically we should remove the session or set false?
    // Let's set false.

    doc.sessions.set(sName, sess);
    await doc.save();
    return res.json({ message: "Updated", attendance: doc });

  } catch (err) {
    console.error("update error", err);
    res.status(500).json({ error: "Update failed" });
  }
};

// Delete: Deletes the entire document for this student+event
exports.deleteAttendance = async (req, res) => {
  try {
    const { regno } = req.params;
    const { eventName } = req.query;

    if (!eventName) return res.status(400).json({ error: "eventName required" });

    await Attendance.deleteOne({ regno: new RegExp(`^${regno}$`, "i"), eventName });
    res.json({ message: `Deleted attendance for ${regno} in ${eventName}` });
  } catch (err) {
    console.error("delete error", err);
    res.status(500).json({ error: "Delete failed" });
  }
};
