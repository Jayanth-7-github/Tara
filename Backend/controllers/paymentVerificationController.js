const Event = require("../models/Event");
const PaymentReference = require("../models/PaymentReference");
const PaymentVerification = require("../models/PaymentVerification");
const RoleConfig = require("../models/RoleConfig");
const Student = require("../models/Student");
const Team = require("../models/Team");
const User = require("../models/User");

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeUpper(value) {
  return normalizeText(value).toUpperCase();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function getManagersFromRoleConfig(roleConfig, keys) {
  if (!roleConfig?.eventManagersByEvent) {
    return [];
  }

  const values = [];
  for (const key of keys) {
    if (!key) continue;

    let list = [];
    if (roleConfig.eventManagersByEvent instanceof Map) {
      list = roleConfig.eventManagersByEvent.get(key) || [];
    } else {
      list = roleConfig.eventManagersByEvent[key] || [];
    }

    if (Array.isArray(list)) {
      values.push(...list);
    }
  }

  return Array.from(
    new Set(
      values.map((value) =>
        String(value || "")
          .toLowerCase()
          .trim(),
      ),
    ),
  );
}

async function requireManagedEvent(req, res, eventId) {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const [event, actor] = await Promise.all([
    Event.findById(eventId).lean(),
    User.findById(req.user.id).lean(),
  ]);

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return null;
  }

  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  if (actor.role === "admin") {
    return { actor, event };
  }

  const actorEmail = normalizeLower(actor.email);
  const managerEmail = normalizeLower(event.managerEmail);
  if (actorEmail && managerEmail && actorEmail === managerEmail) {
    return { actor, event };
  }

  const roleConfig = await RoleConfig.findOne().lean();
  const keys = [String(event._id || ""), normalizeText(event.title)].filter(
    Boolean,
  );
  const allowedManagers = getManagersFromRoleConfig(roleConfig, keys);

  if (actorEmail && allowedManagers.includes(actorEmail)) {
    return { actor, event };
  }

  res.status(403).json({ error: "Forbidden" });
  return null;
}

function buildParticipantSnapshot(raw) {
  return {
    name: normalizeText(raw?.name),
    regno: normalizeUpper(raw?.regno),
    email: normalizeLower(raw?.email),
    phone: normalizeText(raw?.phone),
    branch: normalizeText(raw?.branch),
    section: normalizeText(raw?.section),
    college: normalizeText(raw?.college),
    year: normalizeText(raw?.year),
  };
}

async function upsertStudentFromSnapshot(snapshot, role) {
  const normalized = buildParticipantSnapshot(snapshot);
  let student = null;

  if (normalized.regno) {
    student = await Student.findOne({ regno: normalized.regno });
  }
  if (!student && normalized.email) {
    student = await Student.findOne({ email: normalized.email });
  }

  const payload = {
    regno: normalized.regno,
    name: normalized.name,
    email: normalized.email || undefined,
    phone: normalized.phone || undefined,
    branch: normalized.branch || undefined,
    department: normalized.branch || undefined,
    section: normalized.section || undefined,
    college: normalized.college || undefined,
    year: normalized.year || undefined,
    role,
  };

  if (student) {
    Object.assign(student, payload);
    await student.save();
    return student;
  }

  return Student.create(payload);
}

function buildApprovedRegistrationEntry(verification, eventTitle) {
  return {
    event: verification.event,
    eventName: eventTitle || verification.eventTitle || "",
    registeredAt: new Date(),
    paymentReference: verification.paymentReference,
    paymentScreenshotUrl: verification.paymentScreenshotUrl,
    paymentScreenshotPublicId: verification.paymentScreenshotPublicId,
    paymentAmount: verification.paymentAmount,
    paymentStatus: "approved",
    paymentSubmittedAt:
      verification.paymentSubmittedAt || verification.createdAt || new Date(),
  };
}

async function ensureStudentRegistration(student, verification, eventTitle) {
  student.registrations = Array.isArray(student.registrations)
    ? student.registrations
    : [];

  const alreadyRegistered = student.registrations.some(
    (entry) =>
      entry.event && entry.event.toString() === String(verification.event),
  );
  if (alreadyRegistered) {
    return false;
  }

  student.registrations.push(
    buildApprovedRegistrationEntry(verification, eventTitle),
  );
  await student.save();
  return true;
}

async function approveSoloVerification(verification, actor, eventDoc) {
  const student = await upsertStudentFromSnapshot(
    verification.participant,
    "Member",
  );
  const added = await ensureStudentRegistration(
    student,
    verification,
    eventDoc?.title,
  );

  if (!added) {
    const error = new Error("Student is already registered for this event");
    error.status = 409;
    throw error;
  }

  await Event.findByIdAndUpdate(verification.event, {
    $inc: { registeredCount: 1 },
  });

  await PaymentReference.findOneAndUpdate(
    { reference: verification.paymentReference },
    { student: student._id },
  );

  verification.status = "approved";
  verification.reviewedBy = actor._id;
  verification.reviewedAt = new Date();
  verification.approvedStudent = student._id;
  await verification.save();

  return verification;
}

async function approveTeamVerification(verification, actor, eventDoc) {
  const teamName = normalizeText(verification.teamName);
  const leaderDoc = await upsertStudentFromSnapshot(
    verification.leader,
    "Leader",
  );
  const members = Array.isArray(verification.members)
    ? verification.members
    : [];
  const memberDocs = [];

  for (const member of members) {
    const student = await upsertStudentFromSnapshot(member, "Member");
    memberDocs.push(student);
  }

  const existingTeam = await Team.findOne({
    event: verification.event,
    $or: [{ leader: leaderDoc._id }, { name: teamName }],
  }).lean();
  if (existingTeam) {
    const error = new Error("A team already exists for this event");
    error.status = 409;
    throw error;
  }

  const team = await Team.create({
    event: verification.event,
    name: teamName,
    leader: leaderDoc._id,
    members: memberDocs.map((student) => student._id),
    paymentReference: verification.paymentReference,
    paymentScreenshotUrl: verification.paymentScreenshotUrl,
    paymentScreenshotPublicId: verification.paymentScreenshotPublicId,
    paymentAmount: verification.paymentAmount,
    paymentStatus: "approved",
    paymentSubmittedAt:
      verification.paymentSubmittedAt || verification.createdAt || new Date(),
  });

  await ensureStudentRegistration(leaderDoc, verification, eventDoc?.title);
  for (const member of memberDocs) {
    await ensureStudentRegistration(member, verification, eventDoc?.title);
  }

  await Event.findByIdAndUpdate(verification.event, {
    $inc: { registeredCount: 1 + memberDocs.length },
  });

  await PaymentReference.findOneAndUpdate(
    { reference: verification.paymentReference },
    { student: leaderDoc._id, team: team._id },
  );

  verification.status = "approved";
  verification.reviewedBy = actor._id;
  verification.reviewedAt = new Date();
  verification.approvedStudent = leaderDoc._id;
  verification.approvedTeam = team._id;
  await verification.save();

  return verification;
}

async function listPaymentVerifications(req, res) {
  try {
    const eventId = normalizeText(req.query.eventId);
    const status = normalizeText(req.query.status);

    if (!eventId) {
      return res.status(400).json({ error: "eventId is required" });
    }

    const access = await requireManagedEvent(req, res, eventId);
    if (!access) return;

    const filter = { event: access.event._id };
    if (status && ["submitted", "approved", "rejected"].includes(status)) {
      filter.status = status;
    }

    const items = await PaymentVerification.find(filter)
      .sort({ status: 1, paymentSubmittedAt: -1, createdAt: -1 })
      .populate({ path: "reviewedBy", select: "name email" })
      .lean();

    return res.json({ items });
  } catch (err) {
    console.error("listPaymentVerifications error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function reviewPaymentVerification(req, res) {
  try {
    const decision = normalizeText(req.body?.decision).toLowerCase();
    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({
        error: "decision must be approved or rejected",
      });
    }

    const verification = await PaymentVerification.findById(req.params.id);
    if (!verification) {
      return res.status(404).json({ error: "Payment verification not found" });
    }

    if (verification.status !== "submitted") {
      return res.status(409).json({
        error: "Payment verification has already been reviewed",
      });
    }

    const access = await requireManagedEvent(req, res, verification.event);
    if (!access) return;

    if (decision === "rejected") {
      verification.status = "rejected";
      verification.reviewedBy = access.actor._id;
      verification.reviewedAt = new Date();
      await verification.save();
      return res.json({ success: true, item: verification });
    }

    const item =
      verification.registrationType === "team"
        ? await approveTeamVerification(
            verification,
            access.actor,
            access.event,
          )
        : await approveSoloVerification(
            verification,
            access.actor,
            access.event,
          );

    return res.json({ success: true, item });
  } catch (err) {
    console.error("reviewPaymentVerification error", err);
    return res.status(err?.status || 500).json({
      error: err?.message || "Internal server error",
    });
  }
}

module.exports = {
  listPaymentVerifications,
  reviewPaymentVerification,
};
