const Team = require("../models/Team");
const Event = require("../models/Event");
const PaymentVerification = require("../models/PaymentVerification");
const Student = require("../models/Student");
const ProblemStatement = require("../models/ProblemStatement");
const RoleConfig = require("../models/RoleConfig");
const User = require("../models/User");
const { destroyRegistrationPaymentImage } = require("../services/cloudinary");
const {
  getActivePaymentQr,
  isPaidEvent,
  normalizePaymentReference,
  releasePaymentReference,
  reservePaymentReference,
  uploadPaymentProofImage,
} = require("../utils/registrationPayment");

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeUpper(value) {
  return normalizeText(value).toUpperCase();
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

function applyTeamPopulate(query) {
  return query
    .populate({ path: "event", select: "title" })
    .populate({
      path: "leader",
      select: "name regno email phone branch section college year",
    })
    .populate({
      path: "members",
      select: "name regno email phone branch section college year",
    })
    .populate({
      path: "selectedProblemStatement",
      select: "title description isActive order",
    })
    .populate({
      path: "selectedProblemStatementBy",
      select: "name regno",
    });
}

function getStudentFromTeam(team, regno) {
  const targetRegno = normalizeUpper(regno);
  if (!targetRegno) return null;

  const leaderRegno = normalizeUpper(team?.leader?.regno);
  if (leaderRegno && leaderRegno === targetRegno) {
    return team.leader;
  }

  const members = Array.isArray(team?.members) ? team.members : [];
  return (
    members.find((member) => normalizeUpper(member?.regno) === targetRegno) ||
    null
  );
}

async function getAuthenticatedTeamAccess(req, res, teamId) {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const [actor, team] = await Promise.all([
    User.findById(req.user.id).lean(),
    applyTeamPopulate(Team.findById(teamId)).lean(),
  ]);

  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return null;
  }

  const actorRegno = normalizeUpper(actor.regno);
  if (!actorRegno) {
    res.status(403).json({
      error:
        "Only authenticated team members can access team problem statements",
    });
    return null;
  }

  const teamStudent = getStudentFromTeam(team, actorRegno);
  if (!teamStudent) {
    res.status(403).json({
      error: "You are not a member of this team",
    });
    return null;
  }

  return { actor, team, teamStudent };
}

async function getManagedTeamAccess(req, res, teamId) {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const [actor, team] = await Promise.all([
    User.findById(req.user.id).lean(),
    applyTeamPopulate(Team.findById(teamId)).lean(),
  ]);

  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return null;
  }

  const event = await Event.findById(team.event?._id || team.event).lean();
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return null;
  }

  if (actor.role === "admin") {
    return { actor, team, event };
  }

  const actorEmail = normalizeText(actor.email).toLowerCase();
  const managerEmail = normalizeText(event.managerEmail).toLowerCase();
  if (actorEmail && managerEmail && actorEmail === managerEmail) {
    return { actor, team, event };
  }

  const roleConfig = await RoleConfig.findOne().lean();
  const managerKeys = [
    String(event._id || ""),
    normalizeText(event.title),
  ].filter(Boolean);
  const allowedManagers = getManagersFromRoleConfig(roleConfig, managerKeys);

  if (actorEmail && allowedManagers.includes(actorEmail)) {
    return { actor, team, event };
  }

  res.status(403).json({ error: "Forbidden" });
  return null;
}

function normalizeProblemStatement(item) {
  if (!item) return null;

  return {
    ...item,
    description: normalizeText(item.description || item.statement),
  };
}

/**
 * Create a team for an event. Validates team size and links students.
 * Expects JSON body: { eventId, name, leaderRegno, memberRegnos: [regno1, regno2, ...] }
 */
async function createTeam(req, res) {
  try {
    const {
      eventId,
      name,
      leader,
      members,
      paymentReference,
      transactionId,
      utrNumber,
      paymentScreenshotBase64,
      paymentScreenshotType,
      paymentScreenshotUrl,
    } = req.body;
    // leader: { regno, name, email, phone, branch, section, college, year }
    // members: array of { regno, name, email, phone, branch, section, college, year }
    if (!eventId || !name || !leader || !Array.isArray(members)) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.participationType !== "team") {
      return res
        .status(400)
        .json({ error: "This event does not support team registration" });
    }
    // Team size includes leader
    const teamSize = 1 + members.length;
    const paymentAmount = Number(event.price || 0) * teamSize;
    if (teamSize < event.minTeamSize || teamSize > event.maxTeamSize) {
      return res.status(400).json({
        error: `Team size must be between ${event.minTeamSize} and ${event.maxTeamSize}`,
      });
    }

    if (isPaidEvent(event)) {
      const teamName = normalizeText(name);
      const leaderRegno = normalizeUpper(leader?.regno);
      const leaderStudent = leaderRegno
        ? await Student.findOne({ regno: leaderRegno }).select("_id").lean()
        : null;

      const teamConflictClauses = [{ event: event._id, name: teamName }];
      if (leaderStudent?._id) {
        teamConflictClauses.push({
          event: event._id,
          leader: leaderStudent._id,
        });
      }

      const existingTeam = await Team.findOne({
        $or: teamConflictClauses,
      }).lean();
      if (existingTeam) {
        return res.status(400).json({
          error:
            existingTeam.name === teamName
              ? "This team name is already taken for this event"
              : "Leader already has a team for this event",
        });
      }

      const existingVerification = await PaymentVerification.findOne({
        event: event._id,
        registrationType: "team",
        status: { $in: ["submitted", "approved"] },
        $or: [{ teamName }, { "leader.regno": leaderRegno }],
      }).lean();
      if (existingVerification) {
        return res.status(400).json({
          error:
            existingVerification.status === "submitted"
              ? "Payment verification is already pending for this team"
              : "A team is already registered for this event",
        });
      }

      const activePaymentQr = await getActivePaymentQr(event._id);
      if (!activePaymentQr) {
        return res.status(400).json({
          error:
            "Payment QR is not available for this event yet. Please contact the organizer.",
        });
      }

      const normalizedReference = normalizePaymentReference(
        paymentReference || transactionId || utrNumber,
      );
      let reservedReference = null;
      let uploadedPaymentProof = null;
      try {
        reservedReference = await reservePaymentReference({
          reference: normalizedReference,
          eventId: event._id,
          registrationType: "team",
        });

        uploadedPaymentProof = await uploadPaymentProofImage({
          imageBase64: paymentScreenshotBase64,
          imageType: paymentScreenshotType,
          imageUrl: paymentScreenshotUrl,
          eventId: event._id,
          paymentReference: normalizedReference,
          regno: leaderRegno,
          teamName,
        });

        const item = await PaymentVerification.create({
          event: event._id,
          eventTitle: event.title || "",
          registrationType: "team",
          teamName,
          leader: {
            name: normalizeText(leader?.name),
            regno: leaderRegno,
            email: normalizeText(leader?.email).toLowerCase(),
            phone: normalizeText(leader?.phone),
            branch: normalizeText(leader?.branch),
            section: normalizeText(leader?.section),
            college: normalizeText(leader?.college),
            year: normalizeText(leader?.year),
          },
          members: Array.isArray(members)
            ? members.map((member) => ({
                name: normalizeText(member?.name),
                regno: normalizeUpper(member?.regno),
                email: normalizeText(member?.email).toLowerCase(),
                phone: normalizeText(member?.phone),
                branch: normalizeText(member?.branch),
                section: normalizeText(member?.section),
                college: normalizeText(member?.college),
                year: normalizeText(member?.year),
              }))
            : [],
          paymentReference: reservedReference.reference,
          paymentScreenshotUrl: uploadedPaymentProof.secureUrl,
          paymentScreenshotPublicId: uploadedPaymentProof.publicId,
          paymentAmount,
          paymentSubmittedAt: new Date(),
        });

        return res.status(202).json({
          success: true,
          verificationPending: true,
          item,
        });
      } catch (submissionErr) {
        if (reservedReference?.reference) {
          await releasePaymentReference(reservedReference.reference);
        }
        if (uploadedPaymentProof?.publicId) {
          await destroyRegistrationPaymentImage(uploadedPaymentProof.publicId);
        }
        throw submissionErr;
      }
    }

    // Upsert leader with role 'Leader'
    let leaderDoc = await Student.findOne({ regno: leader.regno });
    if (!leaderDoc) {
      leaderDoc = await Student.create({ ...leader, role: "Leader" });
    } else {
      Object.assign(leaderDoc, leader, { role: "Leader" });
      await leaderDoc.save();
    }

    // Upsert members with role 'Member'
    const memberDocs = [];
    for (const m of members) {
      let student = await Student.findOne({ regno: m.regno });
      if (!student) {
        student = await Student.create({ ...m, role: "Member" });
      } else {
        Object.assign(student, m, { role: "Member" });
        await student.save();
      }
      memberDocs.push(student._id);
    }

    // Prevent duplicate teams for same event and leader
    const existing = await Team.findOne({
      event: event._id,
      leader: leaderDoc._id,
    });
    if (existing) {
      return res
        .status(400)
        .json({ error: "Leader already has a team for this event" });
    }

    let reservedReference = null;
    let uploadedPaymentProof = null;
    if (isPaidEvent(event)) {
      const activePaymentQr = await getActivePaymentQr(event._id);
      if (!activePaymentQr) {
        return res.status(400).json({
          error:
            "Payment QR is not available for this event yet. Please contact the organizer.",
        });
      }

      const normalizedReference = normalizePaymentReference(
        paymentReference || transactionId || utrNumber,
      );
      reservedReference = await reservePaymentReference({
        reference: normalizedReference,
        eventId: event._id,
        registrationType: "team",
        studentId: leaderDoc._id,
      });

      try {
        uploadedPaymentProof = await uploadPaymentProofImage({
          imageBase64: paymentScreenshotBase64,
          imageType: paymentScreenshotType,
          imageUrl: paymentScreenshotUrl,
          eventId: event._id,
          paymentReference: normalizedReference,
          regno: leaderDoc.regno,
          teamName: name,
        });
      } catch (paymentErr) {
        await releasePaymentReference(normalizedReference);
        throw paymentErr;
      }
    }

    // Create team
    let team;
    try {
      team = await Team.create({
        event: event._id,
        name,
        leader: leaderDoc._id,
        members: memberDocs,
        paymentReference: reservedReference?.reference,
        paymentScreenshotUrl: uploadedPaymentProof?.secureUrl,
        paymentScreenshotPublicId: uploadedPaymentProof?.publicId,
        paymentAmount: reservedReference ? paymentAmount : undefined,
        paymentStatus: reservedReference ? "submitted" : undefined,
        paymentSubmittedAt: reservedReference ? new Date() : undefined,
      });
    } catch (createErr) {
      if (reservedReference?.reference) {
        await releasePaymentReference(reservedReference.reference);
      }
      if (uploadedPaymentProof?.publicId) {
        await destroyRegistrationPaymentImage(uploadedPaymentProof.publicId);
      }
      throw createErr;
    }

    if (reservedReference?._id) {
      reservedReference.team = team._id;
      await reservedReference.save();
    }
    // Optionally, update students' registrations
    // Add event registration for leader and members if not already registered
    const allStudents = [leaderDoc, ...memberDocs.map((id) => ({ _id: id }))];
    for (const s of allStudents) {
      const student = await Student.findById(s._id);
      if (!student.registrations) student.registrations = [];
      const already = student.registrations.some(
        (r) => r.event && r.event.toString() === event._id.toString(),
      );
      if (!already) {
        student.registrations.push({
          event: event._id,
          eventName: event.title || "",
          registeredAt: new Date(),
        });
        await student.save();
      }
    }
    // Increment event registeredCount by team size
    await Event.findByIdAndUpdate(event._id, {
      $inc: { registeredCount: teamSize },
    });
    // Populate event name and members for response
    const populatedTeam = await applyTeamPopulate(Team.findById(team._id));
    return res.status(201).json({ success: true, team: populatedTeam });
  } catch (err) {
    console.error("createTeam error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Fetch teams for an event or all teams, with event name and member details
async function getTeams(req, res) {
  try {
    const filter = {};
    if (req.query.eventId) filter.event = req.query.eventId;
    const teams = await applyTeamPopulate(Team.find(filter));
    res.json({ success: true, teams });
  } catch (err) {
    console.error("getTeams error", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getTeamProblemStatements(req, res) {
  try {
    const access = await getAuthenticatedTeamAccess(
      req,
      res,
      req.params.teamId,
    );
    if (!access) return;

    const items = await ProblemStatement.find({
      event: access.team.event?._id || access.team.event,
      isActive: true,
    })
      .sort({ order: 1, updatedAt: -1, createdAt: -1 })
      .lean();

    return res.json({
      items: items.map(normalizeProblemStatement),
      team: {
        _id: access.team._id,
        name: access.team.name,
        selectedProblemStatement: normalizeProblemStatement(
          access.team.selectedProblemStatement,
        ),
        selectedProblemStatementBy: access.team.selectedProblemStatementBy,
        selectedProblemStatementAt: access.team.selectedProblemStatementAt,
      },
    });
  } catch (err) {
    console.error("getTeamProblemStatements error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function selectTeamProblemStatement(req, res) {
  try {
    const access = await getAuthenticatedTeamAccess(
      req,
      res,
      req.params.teamId,
    );
    if (!access) return;

    if (access.team.selectedProblemStatement) {
      return res.status(409).json({
        error:
          "This team has already selected a problem statement and it cannot be changed",
      });
    }

    const problemStatementId = normalizeText(req.body?.problemStatementId);
    if (!problemStatementId) {
      return res.status(400).json({ error: "problemStatementId is required" });
    }

    const item = await ProblemStatement.findById(problemStatementId).lean();
    if (!item) {
      return res.status(404).json({ error: "Problem statement not found" });
    }

    const teamEventId = String(
      access.team.event?._id || access.team.event || "",
    );
    if (String(item.event || "") !== teamEventId) {
      return res.status(400).json({
        error: "Problem statement does not belong to this team's event",
      });
    }

    if (!item.isActive) {
      return res.status(400).json({
        error: "Only active problem statements can be selected",
      });
    }

    const updatedTeam = await applyTeamPopulate(
      Team.findOneAndUpdate(
        {
          _id: access.team._id,
          $or: [
            { selectedProblemStatement: { $exists: false } },
            { selectedProblemStatement: null },
          ],
        },
        {
          $set: {
            selectedProblemStatement: item._id,
            selectedProblemStatementBy: access.teamStudent._id,
            selectedProblemStatementAt: new Date(),
          },
        },
        { new: true },
      ),
    );

    if (!updatedTeam) {
      return res.status(409).json({
        error:
          "This team has already selected a problem statement and it cannot be changed",
      });
    }

    return res.json({
      success: true,
      team: updatedTeam,
      selectedProblemStatement: normalizeProblemStatement(
        updatedTeam.selectedProblemStatement,
      ),
    });
  } catch (err) {
    console.error("selectTeamProblemStatement error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function resetTeamProblemStatement(req, res) {
  try {
    const access = await getManagedTeamAccess(req, res, req.params.teamId);
    if (!access) return;

    if (!access.team.selectedProblemStatement) {
      return res.status(400).json({
        error: "This team has not selected a problem statement yet",
      });
    }

    const updatedTeam = await applyTeamPopulate(
      Team.findByIdAndUpdate(
        access.team._id,
        {
          $set: {
            selectedProblemStatement: null,
            selectedProblemStatementBy: null,
            selectedProblemStatementAt: null,
          },
        },
        { new: true },
      ),
    );

    return res.json({
      success: true,
      team: updatedTeam,
      message: "Team can select a problem statement again",
    });
  } catch (err) {
    console.error("resetTeamProblemStatement error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  createTeam,
  getTeams,
  getTeamProblemStatements,
  selectTeamProblemStatement,
  resetTeamProblemStatement,
};
