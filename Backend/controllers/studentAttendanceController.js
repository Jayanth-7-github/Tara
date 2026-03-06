const Team = require("../models/Team");
const Event = require("../models/Event");
const Student = require("../models/Student");
const User = require("../models/User");
const RoleConfig = require("../models/RoleConfig");
const StudentAttendance = require("../models/StudentAttendance");

function normalizeSessionName(sessionName) {
  const s = String(sessionName || "").trim();
  return s || "default";
}

function parseDataUrl(dataUrl) {
  const raw = String(dataUrl || "");
  const m = raw.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) return null;
  return { mime: m[1], base64: m[2] };
}

function estimateBytesFromBase64(base64) {
  // base64 length -> bytes (approx)
  // ignore padding, this is an estimate for limits
  const len = String(base64 || "").length;
  return Math.floor((len * 3) / 4);
}

async function getActor(req) {
  if (!req.user || !req.user.id) return null;
  return User.findById(req.user.id).lean();
}

async function isEventManagerForEvent({ actor, eventDoc }) {
  if (!actor || !eventDoc) return false;
  if (actor.role === "admin") return true;

  const actorEmail = actor.email
    ? String(actor.email).toLowerCase().trim()
    : "";
  if (!actorEmail) return false;

  if (
    eventDoc.managerEmail &&
    String(eventDoc.managerEmail).toLowerCase().trim() === actorEmail
  ) {
    return true;
  }

  try {
    const rc = await RoleConfig.findOne().lean();
    if (!rc || !rc.eventManagersByEvent) return false;
    const evKey =
      (eventDoc.title && String(eventDoc.title).trim()) || String(eventDoc._id);
    const list = Array.isArray(rc.eventManagersByEvent[evKey])
      ? rc.eventManagersByEvent[evKey]
      : [];
    const normalized = list.map((x) => String(x).toLowerCase().trim());
    return normalized.includes(actorEmail);
  } catch (e) {
    return false;
  }
}

async function canSubmitForTeam({ actor, teamDoc }) {
  if (!actor || !teamDoc) return false;
  if (actor.role === "admin") return true;
  if (actor.role === "member") return true; // allow event managers to assist if needed

  // Prefer matching by regno if present, else by email
  const actorRegno = actor.regno
    ? String(actor.regno).toUpperCase().trim()
    : "";
  const actorEmail = actor.email
    ? String(actor.email).toLowerCase().trim()
    : "";

  let actorStudent = null;
  if (actorRegno) {
    actorStudent = await Student.findOne({
      regno: new RegExp(`^${actorRegno}$`, "i"),
    })
      .select("_id")
      .lean();
  }
  if (!actorStudent && actorEmail) {
    actorStudent = await Student.findOne({
      email: new RegExp(`^${actorEmail}$`, "i"),
    })
      .select("_id")
      .lean();
  }
  if (!actorStudent) return false;

  const actorStudentId = String(actorStudent._id);
  const leaderId = teamDoc.leader ? String(teamDoc.leader) : null;
  const memberIds = Array.isArray(teamDoc.members)
    ? teamDoc.members.map((m) => String(m))
    : [];

  return leaderId === actorStudentId || memberIds.includes(actorStudentId);
}

exports.markStudentAttendance = async (req, res) => {
  try {
    const actor = await getActor(req);
    if (!actor) return res.status(401).json({ error: "Unauthorized" });

    const { teamId, studentId, sessionName, photoDataUrl, eventId } =
      req.body || {};

    if (!teamId || !studentId) {
      return res
        .status(400)
        .json({ error: "teamId and studentId are required" });
    }

    const sName = normalizeSessionName(sessionName);

    if (!photoDataUrl) {
      return res.status(400).json({ error: "photoDataUrl is required" });
    }

    const parsed = parseDataUrl(photoDataUrl);
    if (!parsed) {
      return res
        .status(400)
        .json({ error: "photoDataUrl must be a base64 data URL" });
    }

    const allowed = new Set([
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ]);
    if (!allowed.has(parsed.mime)) {
      return res.status(400).json({ error: "Unsupported image type" });
    }

    const bytes = estimateBytesFromBase64(parsed.base64);
    if (bytes > 2.5 * 1024 * 1024) {
      return res.status(400).json({ error: "Image too large (max 2.5MB)" });
    }

    const team = await Team.findById(teamId).lean();
    if (!team) return res.status(404).json({ error: "Team not found" });

    if (!(await canSubmitForTeam({ actor, teamDoc: team }))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Ensure the student belongs to the team
    const leaderId = team.leader ? String(team.leader) : null;
    const memberIds = Array.isArray(team.members)
      ? team.members.map((m) => String(m))
      : [];

    const sid = String(studentId);
    if (leaderId !== sid && !memberIds.includes(sid)) {
      return res.status(400).json({ error: "Student does not belong to team" });
    }

    const student = await Student.findById(studentId).lean();
    if (!student) return res.status(404).json({ error: "Student not found" });

    const evId = eventId || team.event;
    if (!evId) return res.status(400).json({ error: "eventId is required" });

    const event = await Event.findById(evId).lean();
    if (!event) return res.status(404).json({ error: "Event not found" });

    // Ensure team belongs to event
    if (String(team.event) !== String(event._id)) {
      return res.status(400).json({ error: "Team does not belong to event" });
    }

    const filter = {
      event: event._id,
      team: team._id,
      student: student._id,
      sessionName: sName,
    };

    const existing = await StudentAttendance.findOne(filter);

    if (existing && existing.status === "approved") {
      return res
        .status(409)
        .json({ error: "Attendance already approved for this session" });
    }

    if (existing && existing.status === "pending") {
      return res
        .status(409)
        .json({ error: "Attendance already submitted and pending review" });
    }

    if (
      existing &&
      existing.status === "rejected" &&
      !Boolean(existing.allowResubmit)
    ) {
      return res.status(409).json({
        error:
          "Attendance was rejected. Ask the Event Manager to allow re-marking for this session.",
      });
    }

    let doc;
    if (!existing) {
      doc = await StudentAttendance.create({
        ...filter,
        photoDataUrl,
        status: "pending",
        allowResubmit: false,
        submittedBy: actor._id,
      });
    } else {
      existing.photoDataUrl = photoDataUrl;
      existing.status = "pending";
      existing.allowResubmit = false;
      existing.submittedBy = actor._id;
      existing.reviewedBy = undefined;
      existing.reviewedAt = undefined;
      existing.reviewComment = undefined;
      doc = await existing.save();
    }

    return res.status(201).json({
      message: "Attendance submitted for review",
      attendance: doc,
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: "Attendance already submitted" });
    }
    console.error("markStudentAttendance error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.reviewStudentAttendance = async (req, res) => {
  try {
    const actor = await getActor(req);
    if (!actor) return res.status(401).json({ error: "Unauthorized" });

    const id = req.params.id;
    const { decision, comment } = req.body || {};

    if (!id) return res.status(400).json({ error: "id is required" });

    const normalizedDecision = String(decision || "")
      .toLowerCase()
      .trim();
    if (
      !normalizedDecision ||
      !["approved", "rejected"].includes(normalizedDecision)
    ) {
      return res
        .status(400)
        .json({ error: "decision must be approved or rejected" });
    }

    const doc = await StudentAttendance.findById(id);
    if (!doc)
      return res.status(404).json({ error: "Attendance record not found" });

    const event = await Event.findById(doc.event).lean();
    if (!event) return res.status(404).json({ error: "Event not found" });

    const allowed = await isEventManagerForEvent({ actor, eventDoc: event });
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    doc.status = normalizedDecision;
    doc.allowResubmit = false;
    doc.reviewedBy = actor._id;
    doc.reviewedAt = new Date();
    doc.reviewComment = comment != null ? String(comment).trim() : undefined;

    await doc.save();

    return res.json({
      message: `Attendance ${normalizedDecision}`,
      attendance: doc,
    });
  } catch (err) {
    console.error("reviewStudentAttendance error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.allowStudentAttendanceResubmit = async (req, res) => {
  try {
    const actor = await getActor(req);
    if (!actor) return res.status(401).json({ error: "Unauthorized" });

    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "id is required" });

    const doc = await StudentAttendance.findById(id);
    if (!doc)
      return res.status(404).json({ error: "Attendance record not found" });

    const event = await Event.findById(doc.event).lean();
    if (!event) return res.status(404).json({ error: "Event not found" });

    const allowed = await isEventManagerForEvent({ actor, eventDoc: event });
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    if (String(doc.status) !== "rejected") {
      return res
        .status(400)
        .json({ error: "Re-marking can only be enabled for rejected records" });
    }

    doc.allowResubmit = true;
    await doc.save();

    return res.json({
      message: "Re-marking enabled for this student and session",
      attendance: doc,
    });
  } catch (err) {
    console.error("allowStudentAttendanceResubmit error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.getAttendanceRecords = async (req, res) => {
  try {
    const actor = await getActor(req);
    if (!actor) return res.status(401).json({ error: "Unauthorized" });

    const { teamId, sessionName, eventId, status } = req.query || {};
    if (!teamId) return res.status(400).json({ error: "teamId is required" });

    const team = await Team.findById(teamId).lean();
    if (!team) return res.status(404).json({ error: "Team not found" });

    const evId = eventId || team.event;
    if (!evId) return res.status(400).json({ error: "eventId is required" });

    const event = await Event.findById(evId).lean();
    if (!event) return res.status(404).json({ error: "Event not found" });

    // Authorization: team member OR event manager
    const isManager = await isEventManagerForEvent({ actor, eventDoc: event });
    const isTeamMember = await canSubmitForTeam({ actor, teamDoc: team });

    if (!isManager && !isTeamMember) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const query = {
      event: event._id,
      team: team._id,
    };

    if (sessionName) query.sessionName = normalizeSessionName(sessionName);
    if (status) query.status = String(status).toLowerCase().trim();

    const records = await StudentAttendance.find(query)
      .populate({ path: "student", select: "name regno email" })
      .populate({ path: "team", select: "name" })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ records });
  } catch (err) {
    console.error("getAttendanceRecords error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.getManagerSubmissions = async (req, res) => {
  try {
    const actor = await getActor(req);
    if (!actor) return res.status(401).json({ error: "Unauthorized" });

    const { eventId, status, sessionName, teamId } = req.query || {};
    if (!eventId) return res.status(400).json({ error: "eventId is required" });

    const event = await Event.findById(eventId).lean();
    if (!event) return res.status(404).json({ error: "Event not found" });

    const allowed = await isEventManagerForEvent({ actor, eventDoc: event });
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    const query = {
      event: event._id,
    };
    if (teamId) query.team = teamId;
    if (sessionName) query.sessionName = normalizeSessionName(sessionName);
    if (status) query.status = String(status).toLowerCase().trim();

    const records = await StudentAttendance.find(query)
      .populate({ path: "student", select: "name regno email" })
      .populate({ path: "team", select: "name" })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ records });
  } catch (err) {
    console.error("getManagerSubmissions error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
