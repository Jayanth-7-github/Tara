const path = require("path");
const Student = require(path.join(__dirname, "..", "models", "Student"));
const Attendance = require(path.join(__dirname, "..", "models", "Attendance"));
const Event = require(path.join(__dirname, "..", "models", "Event"));
const Team = require(path.join(__dirname, "..", "models", "Team"));

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
    const sName =
      sessionName && typeof sessionName === "string" && sessionName.trim()
        ? sessionName.trim()
        : "default";
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
        sessions: {},
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
          ...(existingSession.toObject
            ? existingSession.toObject()
            : existingSession),
          regno: attendanceDoc.regno,
          eventName: attendanceDoc.eventName,
          sessionName: sName,
          timestampText: formatLocalYMDHM(existingSession.timestamp),
          _id: attendanceDoc._id,
        },
      });
    }

    // New/Update session entry
    const newSession = {
      sessionName: sName,
      timestamp: now,
      timestampText: formatLocalYMDHM(now),
      isPresent: true,
    };

    attendanceDoc.sessions.set(sName, newSession);
    await attendanceDoc.save();

    // Check if all sessions are now marked as present
    const eventDoc = await Event.findOne({ title: event });
    const totalSessions = eventDoc ? eventDoc.sessions.length : 0;
    const markedSessions = attendanceDoc.sessions.size;

    // Verify that all sessions are marked AND all are marked as present
    let allSessionsPresent = true;
    if (markedSessions === totalSessions && totalSessions > 0) {
      for (const sessionData of attendanceDoc.sessions.values()) {
        if (!sessionData.isPresent) {
          allSessionsPresent = false;
          break;
        }
      }
    } else {
      allSessionsPresent = false;
    }

    // If all sessions are marked as present and this is the first time, increment attendedCount
    if (allSessionsPresent && !attendanceDoc.allSessionsMarked) {
      attendanceDoc.allSessionsMarked = true;
      await attendanceDoc.save();

      // Increment Event's attendedCount
      if (eventDoc) {
        await Event.findByIdAndUpdate(
          eventDoc._id,
          { $inc: { attendedCount: 1 } },
          { new: true },
        );
      }
    }

    res.json({
      message: `Attendance marked successfully for ${student.name}.`,
      attendance: {
        ...newSession,
        regno: attendanceDoc.regno,
        eventName: attendanceDoc.eventName,
        sessionName: sName,
        isPresent: true,
        _id: attendanceDoc._id,
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
    const records = Object.values(attendanceDoc.sessions).map((s) => ({
      ...s,
      regno: attendanceDoc.regno,
      eventName: attendanceDoc.eventName,
      student: attendanceDoc.student,
      timestamp:
        s.timestamp instanceof Date ? s.timestamp.getTime() : s.timestamp,
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

    // If requesting a single event and it's a team event, derive team names per regno.
    let teamNameByRegnoLower = {};
    let eventDocForTeam = null;
    if (eventFilter) {
      eventDocForTeam = await Event.findOne({ title: eventFilter })
        .select("_id participationType")
        .lean();
    }

    // Fetch aggregated documents
    const attendanceDocs = await Attendance.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    if (
      eventDocForTeam &&
      eventDocForTeam.participationType === "team" &&
      attendanceDocs.length > 0
    ) {
      const regnos = attendanceDocs
        .map((d) => (d && d.regno ? String(d.regno) : ""))
        .filter(Boolean);

      const stus = await Student.find({ regno: { $in: regnos } })
        .select("_id regno")
        .lean();

      const studentIdByRegnoLower = {};
      const studentIds = [];
      for (const s of stus) {
        const key = s && s.regno ? String(s.regno).toLowerCase() : null;
        if (!key) continue;
        studentIdByRegnoLower[key] = s._id;
        studentIds.push(s._id);
      }

      if (studentIds.length > 0) {
        const teams = await Team.find({
          event: eventDocForTeam._id,
          $or: [
            { leader: { $in: studentIds } },
            { members: { $in: studentIds } },
          ],
        })
          .select("name leader members")
          .lean();

        const teamNameByStudentId = {};
        for (const t of teams) {
          const nm = t.name || "";
          if (!nm) continue;
          const leaderId = t.leader ? String(t.leader) : "";
          if (leaderId) teamNameByStudentId[leaderId] = nm;
          const members = Array.isArray(t.members) ? t.members : [];
          for (const m of members) {
            const mId = m ? String(m) : "";
            if (mId) teamNameByStudentId[mId] = nm;
          }
        }

        for (const [regnoLower, sid] of Object.entries(studentIdByRegnoLower)) {
          const sIdStr = sid ? String(sid) : "";
          teamNameByRegnoLower[regnoLower] = teamNameByStudentId[sIdStr] || "";
        }
      }
    }

    // Flatten logic for summary
    const flattenedRecords = [];
    const countsByEvent = {};
    const byEvent = {};

    for (const doc of attendanceDocs) {
      const e = doc.eventName || "default";
      byEvent[e] = (byEvent[e] || 0) + 1; // Count unique students really

      if (!countsByEvent[e]) {
        countsByEvent[e] = {
          totalRecords: 0,
        };
      }

      // Iterate sessions for this student
      if (doc.sessions) {
        for (const [sKey, sVal] of Object.entries(doc.sessions)) {
          flattenedRecords.push({
            ...sVal,
            regno: doc.regno,
            name: doc.name,
            teamName:
              teamNameByRegnoLower[String(doc.regno || "").toLowerCase()] || "",
            eventName: doc.eventName,
            sessionName: sVal.sessionName || sKey,
            _id: doc._id,
          });

          // Update counts
          countsByEvent[e].totalRecords++;
        }
      }
    }

    const records = flattenedRecords; // Frontend expects array of records
    res.json({
      total: flattenedRecords.length,
      byEvent,
      countsByEvent,
      records,
    });
  } catch (err) {
    console.error("getSummary error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Renamed from exportAttendance to exportCSV per route config
exports.exportCSV = async (req, res) => {
  try {
    const eventName =
      typeof req.query.eventName === "string" ? req.query.eventName.trim() : "";
    const presentOnly = req.query.present === "1";
    const allStudents = req.query.allStudents === "1";

    const escapeRegExp = (s) =>
      String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const toRegnoKey = (v) =>
      String(v || "")
        .trim()
        .toLowerCase();

    const eventNameRegex = eventName
      ? new RegExp(`^${escapeRegExp(eventName)}$`, "i")
      : null;
    const query = eventNameRegex ? { eventName: eventNameRegex } : {};

    // Fetch attendance documents
    const docs = await Attendance.find(query).lean();

    // Fetch event configuration to get session names
    let sessionNames = [];
    let eventDoc = null;

    if (eventNameRegex) {
      eventDoc = await Event.findOne({ title: eventNameRegex }).lean();
      if (eventDoc && eventDoc.sessions) {
        sessionNames = eventDoc.sessions.map((s) => s.name);
      }
    }

    const includeTeamName = !!(
      eventDoc && eventDoc.participationType === "team"
    );

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
    const headers = ["Roll Number", "Name"];
    if (includeTeamName) headers.push("Team Name");
    headers.push("Email", "Hostel", "Event");
    sessionNames.forEach((sName) => {
      headers.push(sName); // Session attendance column
      headers.push(`${sName} - Time`); // Session timestamp column
    });

    const lines = [];
    lines.push(headers.join(","));

    // Group attendance by student (regno) using a normalized key to avoid casing/whitespace mismatches
    const attendanceByRegnoKey = {};
    for (const doc of docs) {
      const key = toRegnoKey(doc && doc.regno);
      if (!key) continue;

      if (!attendanceByRegnoKey[key]) {
        attendanceByRegnoKey[key] = {
          regno: doc.regno,
          name: doc.name,
          eventName: doc.eventName,
          student: doc.student,
          sessions: {},
        };
      } else if (!attendanceByRegnoKey[key].student && doc.student) {
        attendanceByRegnoKey[key].student = doc.student;
      }

      if (doc.sessions) {
        for (const [sName, sVal] of Object.entries(doc.sessions)) {
          attendanceByRegnoKey[key].sessions[sName] = sVal;
        }
      }
    }

    let regnoKeys = Object.keys(attendanceByRegnoKey);
    let students = [];

    if (allStudents && eventName && eventDoc) {
      // Include all students registered for this event
      students = await Student.find({
        "registrations.event": eventDoc._id,
      }).lean();

      const regnoKeySet = new Set(regnoKeys);
      for (const s of students) {
        const k = toRegnoKey(s && s.regno);
        if (k) regnoKeySet.add(k);
      }
      regnoKeys = Array.from(regnoKeySet);
    } else {
      // Default behaviour: only students who have attendance records
      const attendanceRegnos = Object.values(attendanceByRegnoKey)
        .map((x) => x && x.regno)
        .filter(Boolean);
      students = await Student.find({
        regno: { $in: attendanceRegnos },
      }).lean();
    }

    const studentDetailsByRegnoKey = {};
    const studentIdByRegnoKey = {};
    for (const s of students) {
      const k = toRegnoKey(s && s.regno);
      if (!k) continue;
      studentDetailsByRegnoKey[k] = s;
      if (s && s._id) studentIdByRegnoKey[k] = String(s._id);
    }

    // Seed studentId map from attendance docs as a fallback
    for (const [k, entry] of Object.entries(attendanceByRegnoKey)) {
      if (!studentIdByRegnoKey[k] && entry && entry.student) {
        studentIdByRegnoKey[k] = String(entry.student);
      }
    }

    // If this is a team event, derive team name per regno from Team collection
    const teamNameByRegnoKey = {};
    let teamsForEvent = [];
    if (includeTeamName && eventDoc) {
      teamsForEvent = await Team.find({ event: eventDoc._id })
        .select("name leader members")
        .lean();

      const teamNameByStudentId = {};
      for (const t of teamsForEvent) {
        const nm = (t && t.name) || "";
        if (!nm) continue;
        const leaderId = t && t.leader ? String(t.leader) : "";
        if (leaderId) teamNameByStudentId[leaderId] = nm;
        const members = Array.isArray(t && t.members) ? t.members : [];
        for (const m of members) {
          const mId = m ? String(m) : "";
          if (mId) teamNameByStudentId[mId] = nm;
        }
      }

      for (const k of regnoKeys) {
        const studentId = studentIdByRegnoKey[k];
        const fromTeam = studentId
          ? teamNameByStudentId[String(studentId)] || ""
          : "";
        const fallback =
          (studentDetailsByRegnoKey[k] &&
            studentDetailsByRegnoKey[k].teamName) ||
          "";
        teamNameByRegnoKey[k] = fromTeam || fallback;
      }
    }

    // For team events: order rows grouped by team (leader first, then members)
    if (includeTeamName && eventDoc) {
      const regnoKeySet = new Set(regnoKeys);
      const regnoKeyByStudentId = {};
      for (const s of students) {
        if (s && s._id) {
          regnoKeyByStudentId[String(s._id)] = toRegnoKey(s.regno);
        }
      }
      for (const [k, entry] of Object.entries(attendanceByRegnoKey)) {
        const sid = entry && entry.student ? String(entry.student) : "";
        if (sid && !regnoKeyByStudentId[sid]) regnoKeyByStudentId[sid] = k;
      }

      const regnoDisplay = (k) =>
        (studentDetailsByRegnoKey[k] && studentDetailsByRegnoKey[k].regno) ||
        (attendanceByRegnoKey[k] && attendanceByRegnoKey[k].regno) ||
        "";

      if (!Array.isArray(teamsForEvent) || teamsForEvent.length === 0) {
        teamsForEvent = await Team.find({ event: eventDoc._id })
          .select("name leader members")
          .lean();
      }

      // Fallback: if there are no Team docs for this event, still keep team members together
      // by sorting using the derived team name values.
      if (!Array.isArray(teamsForEvent) || teamsForEvent.length === 0) {
        regnoKeys.sort((a, b) => {
          const aTeam = String(teamNameByRegnoKey[a] || "").trim();
          const bTeam = String(teamNameByRegnoKey[b] || "").trim();
          const aTeamKey = aTeam ? aTeam.toLowerCase() : "~"; // blanks last
          const bTeamKey = bTeam ? bTeam.toLowerCase() : "~";
          if (aTeamKey !== bTeamKey) return aTeamKey.localeCompare(bTeamKey);

          const ar = String(regnoDisplay(a) || "");
          const br = String(regnoDisplay(b) || "");
          if (ar !== br) return ar.localeCompare(br);

          const an = String(
            (studentDetailsByRegnoKey[a] && studentDetailsByRegnoKey[a].name) ||
              (attendanceByRegnoKey[a] && attendanceByRegnoKey[a].name) ||
              "",
          );
          const bn = String(
            (studentDetailsByRegnoKey[b] && studentDetailsByRegnoKey[b].name) ||
              (attendanceByRegnoKey[b] && attendanceByRegnoKey[b].name) ||
              "",
          );
          return an.localeCompare(bn);
        });
      } else {
        teamsForEvent.sort((a, b) => {
          const an = String(a?.name || "").toLowerCase();
          const bn = String(b?.name || "").toLowerCase();
          return an.localeCompare(bn);
        });

        const ordered = [];
        const added = new Set();

        for (const t of teamsForEvent) {
          const leaderKey =
            t && t.leader ? regnoKeyByStudentId[String(t.leader)] : null;
          const memberKeys = Array.isArray(t?.members)
            ? t.members
                .map((m) => regnoKeyByStudentId[String(m)])
                .filter(Boolean)
            : [];

          // Only include students relevant to this export
          if (
            leaderKey &&
            regnoKeySet.has(leaderKey) &&
            !added.has(leaderKey)
          ) {
            ordered.push(leaderKey);
            added.add(leaderKey);
          }

          memberKeys.sort((x, y) =>
            String(regnoDisplay(x)).localeCompare(String(regnoDisplay(y))),
          );
          for (const k of memberKeys) {
            if (regnoKeySet.has(k) && !added.has(k)) {
              ordered.push(k);
              added.add(k);
            }
          }
        }

        // Append any remaining students (no team / not found in teams)
        const remaining = regnoKeys.filter((k) => !added.has(k));
        remaining.sort((x, y) =>
          String(regnoDisplay(x)).localeCompare(String(regnoDisplay(y))),
        );
        regnoKeys = ordered.concat(remaining);
      }
    }

    // Build CSV rows
    for (const regnoKey of regnoKeys) {
      const attendanceData = attendanceByRegnoKey[regnoKey];
      const studentDetails = studentDetailsByRegnoKey[regnoKey] || {};

      const displayRegno =
        (studentDetails && studentDetails.regno) ||
        (attendanceData && attendanceData.regno) ||
        "";
      const displayName =
        (studentDetails && studentDetails.name) ||
        (attendanceData && attendanceData.name) ||
        "";
      const rowEventName =
        eventName || (attendanceData && attendanceData.eventName) || "";

      const row = [
        displayRegno,
        displayName,
        ...(includeTeamName ? [teamNameByRegnoKey[regnoKey] || ""] : []),
        studentDetails.email || "",
        studentDetails.hostelName || "",
        rowEventName,
      ];

      let hasPresent = false;

      // Add session attendance and timestamps
      sessionNames.forEach((sName) => {
        const session =
          attendanceData && attendanceData.sessions
            ? attendanceData.sessions[sName]
            : null;
        if (session && session.isPresent) {
          hasPresent = true;
          row.push("Present");
          row.push(
            session.timestampText || formatLocalYMDHM(session.timestamp) || "",
          );
        } else {
          // When exporting all students, explicitly mark Absent
          row.push(allStudents ? "Absent" : "");
          row.push("");
        }
      });

      // If presentOnly filter requested, skip students who were never present
      if (presentOnly && !hasPresent) continue;

      // Escape and add row
      const escaped = row.map((v) => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(escaped.join(","));
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance.csv"`,
    );
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

    if (!eventName)
      return res.status(400).json({ error: "eventName is required" });
    const sName = sessionName || "default";

    let doc = await Attendance.findOne({
      regno: new RegExp(`^${regno}$`, "i"),
      eventName,
    });

    if (!doc) {
      // If document doesn't exist, create it (upsert behavior)
      const Student = require("../models/Student");
      const student = await Student.findOne({
        regno: new RegExp(`^${regno}$`, "i"),
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      doc = new Attendance({
        regno: student.regno,
        name: student.name,
        eventName,
        student: student._id,
        sessions: new Map(),
      });
    }

    // Update session
    if (!doc.sessions) doc.sessions = new Map();

    // Always allow creating a session if updating attendance
    let sess = doc.sessions.get(sName);
    const wasPresent = sess ? sess.isPresent : false;

    if (!sess) {
      // Create if not exists (allows manual marking from admin panel)
      sess = {
        sessionName: sName,
        timestamp: new Date(),
        timestampText: formatLocalYMDHM(new Date()),
        isPresent: true,
      };
    }

    if (isPresent !== undefined) sess.isPresent = isPresent;

    doc.sessions.set(sName, sess);
    await doc.save();

    // Handle attendedCount changes
    const eventDoc = await Event.findOne({ title: eventName });
    const totalSessions = eventDoc ? eventDoc.sessions.length : 0;

    // Check if all sessions are currently marked as present
    let allSessionsPresent = true;
    if (doc.sessions.size === totalSessions && totalSessions > 0) {
      for (const sessionData of doc.sessions.values()) {
        if (!sessionData.isPresent) {
          allSessionsPresent = false;
          break;
        }
      }
    } else {
      allSessionsPresent = false;
    }

    // Case 1: Session changed from present to absent
    if (wasPresent && !sess.isPresent && doc.allSessionsMarked && eventDoc) {
      doc.allSessionsMarked = false;
      await doc.save();
      // Decrement attendedCount
      await Event.findByIdAndUpdate(
        eventDoc._id,
        { $inc: { attendedCount: -1 } },
        { new: true },
      );
    }
    // Case 2: Session changed from absent to present, and now all are present
    else if (
      !wasPresent &&
      sess.isPresent &&
      allSessionsPresent &&
      !doc.allSessionsMarked &&
      eventDoc
    ) {
      doc.allSessionsMarked = true;
      await doc.save();
      // Increment attendedCount
      await Event.findByIdAndUpdate(
        eventDoc._id,
        { $inc: { attendedCount: 1 } },
        { new: true },
      );
    }

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

    if (!eventName)
      return res.status(400).json({ error: "eventName required" });

    await Attendance.deleteOne({
      regno: new RegExp(`^${regno}$`, "i"),
      eventName,
    });
    res.json({ message: `Deleted attendance for ${regno} in ${eventName}` });
  } catch (err) {
    console.error("delete error", err);
    res.status(500).json({ error: "Delete failed" });
  }
};
