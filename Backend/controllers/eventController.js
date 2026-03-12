const Event = require("../models/Event");
const Student = require("../models/Student");
const Team = require("../models/Team");
const TeamMark = require("../models/TeamMark");
const ProblemStatement = require("../models/ProblemStatement");
const PaymentVerification = require("../models/PaymentVerification");
const RoleConfig = require("../models/RoleConfig");
const User = require("../models/User");
const {
  destroyRegistrationPaymentImage,
  destroyEventImage,
  isCloudinaryConfigured,
  uploadEventImage,
} = require("../services/cloudinary");
const {
  getActivePaymentQr,
  isPaidEvent,
  isPaymentReferenceAvailable,
  normalizePaymentReference,
  releasePaymentReference,
  reservePaymentReference,
  uploadPaymentProofImage,
} = require("../utils/registrationPayment");

function extractBase64Payload(raw) {
  const value = String(raw || "");
  const match = value.match(/^data:([^;]+);base64,(.*)$/);
  return {
    mime: match ? match[1] : null,
    base64: match ? match[2] : value,
  };
}

function estimateBytesFromBase64(base64) {
  const length = String(base64 || "").length;
  const padding = String(base64 || "").endsWith("==")
    ? 2
    : String(base64 || "").endsWith("=")
      ? 1
      : 0;
  return Math.floor((length * 3) / 4) - padding;
}

function buildDataUrl(raw, mime) {
  const value = String(raw || "");
  if (value.startsWith("data:")) {
    return value;
  }

  return `data:${mime || "application/octet-stream"};base64,${value}`;
}

function normalizeConfigKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeTeamMarksConfig(config) {
  if (!Array.isArray(config)) {
    return [];
  }

  const seenRounds = new Set();
  const normalizedConfig = [];

  for (const round of config) {
    const roundName = String(round?.roundName || "").trim();
    const roundKey = normalizeConfigKey(roundName);
    if (!roundName || seenRounds.has(roundKey)) {
      continue;
    }

    seenRounds.add(roundKey);

    const seenCategories = new Set();
    const categories = Array.isArray(round?.categories)
      ? round.categories
          .map((category) => {
            const name = String(category?.name || "").trim();
            const key = normalizeConfigKey(name);
            if (!name || seenCategories.has(key)) {
              return null;
            }

            seenCategories.add(key);

            const parsedMaxScore = Number(category?.maxScore);
            return {
              name,
              maxScore:
                Number.isFinite(parsedMaxScore) && parsedMaxScore > 0
                  ? parsedMaxScore
                  : 10,
            };
          })
          .filter(Boolean)
      : [];

    normalizedConfig.push({ roundName, categories });
  }

  return normalizedConfig;
}

function buildRoundConfigSignature(round) {
  return (Array.isArray(round?.categories) ? round.categories : [])
    .map((category) => ({
      name: normalizeConfigKey(category?.name),
      maxScore: Number(category?.maxScore || 0),
    }))
    .filter((category) => Boolean(category.name))
    .sort((left, right) =>
      left.name.localeCompare(right.name, undefined, {
        sensitivity: "base",
        numeric: true,
      }),
    )
    .map((category) => `${category.name}:${category.maxScore}`)
    .join("|");
}

function getRenamedRounds(previousConfig, nextConfig) {
  const previousRounds = normalizeTeamMarksConfig(previousConfig);
  const nextRounds = normalizeTeamMarksConfig(nextConfig);

  const nextByKey = new Set(
    nextRounds.map((round) => normalizeConfigKey(round.roundName)),
  );
  const previousByKey = new Set(
    previousRounds.map((round) => normalizeConfigKey(round.roundName)),
  );

  const removedRounds = previousRounds.filter(
    (round) => !nextByKey.has(normalizeConfigKey(round.roundName)),
  );
  const addedRounds = nextRounds.filter(
    (round) => !previousByKey.has(normalizeConfigKey(round.roundName)),
  );

  const usedAddedIndexes = new Set();
  const renames = [];

  for (const removedRound of removedRounds) {
    const removedSignature = buildRoundConfigSignature(removedRound);
    const matchIndex = addedRounds.findIndex((addedRound, index) => {
      if (usedAddedIndexes.has(index)) {
        return false;
      }

      return buildRoundConfigSignature(addedRound) === removedSignature;
    });

    if (matchIndex === -1) {
      continue;
    }

    const addedRound = addedRounds[matchIndex];
    const fromRoundKey = normalizeConfigKey(removedRound.roundName);
    const toRoundKey = normalizeConfigKey(addedRound.roundName);

    if (!fromRoundKey || !toRoundKey || fromRoundKey === toRoundKey) {
      continue;
    }

    usedAddedIndexes.add(matchIndex);
    renames.push({
      fromRoundName: removedRound.roundName,
      fromRoundKey,
      toRoundName: addedRound.roundName,
      toRoundKey,
    });
  }

  return renames;
}

function isGroupedTeamMarkDoc(doc) {
  return Array.isArray(doc?.categories);
}

function isLegacyTeamMarkDoc(doc) {
  return Boolean(String(doc?.criteriaType || "").trim());
}

function collectTeamMarkCategories(docs = []) {
  const sortedDocs = [...docs].sort(
    (left, right) =>
      new Date(left?.updatedAt || 0).getTime() -
      new Date(right?.updatedAt || 0).getTime(),
  );
  const categoriesByKey = new Map();

  for (const doc of sortedDocs) {
    if (isGroupedTeamMarkDoc(doc)) {
      for (const category of Array.isArray(doc.categories)
        ? doc.categories
        : []) {
        const criteriaType = String(category?.criteriaType || "").trim();
        const criteriaKey = normalizeConfigKey(
          criteriaType || category?.criteriaKey,
        );
        if (!criteriaType || !criteriaKey) {
          continue;
        }

        categoriesByKey.set(criteriaKey, {
          criteriaType,
          criteriaKey,
          score: Number(category?.score || 0),
          maxScore: Number(category?.maxScore || 0),
        });
      }
      continue;
    }

    if (!isLegacyTeamMarkDoc(doc)) {
      continue;
    }

    const criteriaType = String(doc?.criteriaType || "").trim();
    const criteriaKey = normalizeConfigKey(criteriaType || doc?.criteriaKey);
    if (!criteriaType || !criteriaKey) {
      continue;
    }

    categoriesByKey.set(criteriaKey, {
      criteriaType,
      criteriaKey,
      score: Number(doc?.score || 0),
      maxScore: Number(doc?.maxScore || 0),
    });
  }

  return Array.from(categoriesByKey.values());
}

function pickLatestTeamMarkNotes(docs = []) {
  return String(
    [...docs]
      .sort(
        (left, right) =>
          new Date(right?.updatedAt || 0).getTime() -
          new Date(left?.updatedAt || 0).getTime(),
      )
      .find((doc) => String(doc?.notes || "").trim())?.notes || "",
  ).trim();
}

async function syncRenamedTeamMarkRounds({
  eventId,
  previousConfig,
  nextConfig,
  actorId,
}) {
  const renamedRounds = getRenamedRounds(previousConfig, nextConfig);
  if (!renamedRounds.length) {
    return;
  }

  for (const renamedRound of renamedRounds) {
    const relevantDocs = await TeamMark.find({
      event: eventId,
      roundKey: { $in: [renamedRound.fromRoundKey, renamedRound.toRoundKey] },
    })
      .sort({ updatedAt: 1, createdAt: 1 })
      .lean();

    if (!relevantDocs.length) {
      continue;
    }

    const docsByTeam = new Map();
    for (const doc of relevantDocs) {
      const teamId = String(doc?.team || "");
      if (!teamId) {
        continue;
      }

      if (!docsByTeam.has(teamId)) {
        docsByTeam.set(teamId, []);
      }
      docsByTeam.get(teamId).push(doc);
    }

    for (const docs of docsByTeam.values()) {
      const sourceDocs = docs.filter(
        (doc) => String(doc?.roundKey || "") === renamedRound.fromRoundKey,
      );
      if (!sourceDocs.length) {
        continue;
      }

      const targetDocs = docs.filter(
        (doc) => String(doc?.roundKey || "") === renamedRound.toRoundKey,
      );
      const combinedDocs = [...targetDocs, ...sourceDocs];
      const categories = collectTeamMarkCategories(combinedDocs);
      if (!categories.length) {
        continue;
      }

      const primaryDoc =
        targetDocs.find(isGroupedTeamMarkDoc) ||
        sourceDocs.find(isGroupedTeamMarkDoc) ||
        targetDocs[0] ||
        sourceDocs[0];

      await TeamMark.findByIdAndUpdate(
        primaryDoc._id,
        {
          $set: {
            roundName: renamedRound.toRoundName,
            roundKey: renamedRound.toRoundKey,
            categories,
            notes: pickLatestTeamMarkNotes(combinedDocs),
            updatedBy: actorId || primaryDoc.updatedBy,
          },
          $unset: {
            criteriaType: 1,
            criteriaKey: 1,
            score: 1,
            maxScore: 1,
          },
        },
        { runValidators: true },
      );

      const duplicateIds = combinedDocs
        .filter((doc) => String(doc?._id) !== String(primaryDoc._id))
        .map((doc) => doc._id);

      if (duplicateIds.length) {
        await TeamMark.deleteMany({ _id: { $in: duplicateIds } });
      }
    }
  }
}

function getLegacyImageBuffer(event) {
  if (!event?.image?.data) {
    return null;
  }

  let buffer = event.image.data;
  if (buffer && buffer._bsontype === "Binary" && buffer.buffer) {
    buffer = Buffer.from(buffer.buffer);
  }

  if (!Buffer.isBuffer(buffer)) {
    if (buffer && buffer.buffer) {
      buffer = Buffer.from(buffer.buffer);
    } else {
      buffer = Buffer.from(buffer);
    }
  }

  return buffer;
}

async function uploadIncomingEventImage({
  imageBase64,
  imageType,
  imageUrl,
  eventId,
  title,
  existingPublicId,
}) {
  if (!imageBase64 && !imageUrl) {
    return null;
  }

  if (!isCloudinaryConfigured()) {
    const error = new Error(
      "Image uploads require Cloudinary to be configured on the server.",
    );
    error.status = 500;
    throw error;
  }

  let source = null;
  if (imageBase64) {
    const parsed = extractBase64Payload(imageBase64);
    const byteSize = estimateBytesFromBase64(parsed.base64);
    if (byteSize > 5 * 1024 * 1024) {
      const error = new Error("Image size exceeds 5MB limit");
      error.status = 400;
      throw error;
    }

    source = buildDataUrl(imageBase64, imageType || parsed.mime);
  } else if (imageUrl) {
    source = imageUrl;
  }

  return uploadEventImage(source, {
    eventId,
    title,
    existingPublicId,
  });
}

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
      isMcqEnabled,
      isCodingEnabled,
      examSecurityCode,
      sessions,
      teamMarksConfig,
      participationType,
      minTeamSize,
      maxTeamSize,
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

    // Validate team configuration
    let teamType = participationType === "team" ? "team" : "solo";
    let minTeam = teamType === "team" ? Number(minTeamSize) : 1;
    let maxTeam = teamType === "team" ? Number(maxTeamSize) : 1;
    if (teamType === "team") {
      if (!minTeam || !maxTeam || minTeam < 1 || maxTeam < minTeam) {
        return res
          .status(400)
          .json({ error: "Invalid team size configuration" });
      }
    }

    const ev = new Event({
      title,
      description,
      venue,
      date: parsedDate,
      price: normalizedPrice,
      managerEmail: String(managerEmail).toLowerCase().trim(),
      isTestEnabled: isTestEnabled !== undefined ? isTestEnabled : false,
      isMcqEnabled: isMcqEnabled !== undefined ? isMcqEnabled : false,
      isCodingEnabled: isCodingEnabled !== undefined ? isCodingEnabled : false,
      examSecurityCode: examSecurityCode || undefined,
      sessions: sessions || [],
      teamMarksConfig: normalizeTeamMarksConfig(teamMarksConfig),
      participationType: teamType,
      minTeamSize: minTeam,
      maxTeamSize: maxTeam,
    });

    if (imageBase64 || imageUrl) {
      const uploadedImage = await uploadIncomingEventImage({
        imageBase64,
        imageType,
        imageUrl,
        eventId: ev._id.toString(),
        title,
      });

      if (uploadedImage) {
        ev.imageUrl = uploadedImage.secureUrl;
        ev.cloudinaryPublicId = uploadedImage.publicId;
        ev.image = undefined;
      }
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
    const userEmail =
      actor && actor.email ? String(actor.email).toLowerCase().trim() : null;

    // Identify events that need population
    const eventsToPopulate = new Set();

    if (isAdmin) {
      // Admin sees requests for ALL events
      events.forEach((e) => eventsToPopulate.add(e._id.toString()));
    } else if (userEmail) {
      // Manager sees requests for their events
      // Also strictly check role config if needed, but managerEmail is primary
      events.forEach((e) => {
        if (
          e.managerEmail &&
          String(e.managerEmail).toLowerCase().trim() === userEmail
        ) {
          eventsToPopulate.add(e._id.toString());
        }
      });

      // Also check RoleConfig for delegated managers (optional but consistent)
      try {
        const rc = await RoleConfig.findOne().lean();
        if (rc && rc.eventManagersByEvent) {
          events.forEach((e) => {
            const key = (e.title || "").trim() || e._id.toString();
            let managers = [];
            if (
              rc.eventManagersByEvent instanceof Map ||
              typeof rc.eventManagersByEvent.get === "function"
            ) {
              // handled by mongoose map logic usually as object in lean() unless Map type
              // simpler: just check object keys
            }
            // In lean(), Maps are usually POJO if schema type is Map
            // But let's check basic structure
            const mapVal = rc.eventManagersByEvent[key]; // direct access
            if (Array.isArray(mapVal)) managers = mapVal;

            const normManagers = managers.map((m) => String(m).toLowerCase());
            if (normManagers.includes(userEmail)) {
              eventsToPopulate.add(e._id.toString());
            }
          });
        }
      } catch (e) {
        /* ignore role check fail */
      }
    }

    if (eventsToPopulate.size > 0) {
      const studentFields =
        "name regno email department college year hostelName teamName registrations";
      const students = await Student.find({
        "registrations.event": { $in: Array.from(eventsToPopulate) },
      })
        .select(studentFields)
        .lean();

      // For TEAM events, compute team name per student from Team collection.
      // This is event-scoped and more accurate than Student.teamName (which is global).
      const teamEventIds = events
        .filter(
          (e) =>
            e &&
            e._id &&
            eventsToPopulate.has(e._id.toString()) &&
            e.participationType === "team",
        )
        .map((e) => e._id);

      const teamNameByEventAndStudentId = {};
      if (teamEventIds.length > 0) {
        const teams = await Team.find({ event: { $in: teamEventIds } })
          .select("event name leader members")
          .lean();

        for (const t of teams) {
          const eId = t.event ? t.event.toString() : null;
          if (!eId) continue;
          if (!teamNameByEventAndStudentId[eId])
            teamNameByEventAndStudentId[eId] = {};

          const teamName = t.name || "";
          if (!teamName) continue;

          const leaderId = t.leader ? t.leader.toString() : null;
          if (leaderId) teamNameByEventAndStudentId[eId][leaderId] = teamName;

          const members = Array.isArray(t.members) ? t.members : [];
          for (const m of members) {
            const mId = m ? m.toString() : null;
            if (mId) teamNameByEventAndStudentId[eId][mId] = teamName;
          }
        }
      }

      const studentsByEvent = {};

      students.forEach((s) => {
        if (s.registrations && Array.isArray(s.registrations)) {
          s.registrations.forEach((r) => {
            const eId = r.event ? r.event.toString() : null;
            if (eId && eventsToPopulate.has(eId)) {
              if (!studentsByEvent[eId]) studentsByEvent[eId] = [];
              studentsByEvent[eId].push({
                _id: s._id,
                name: s.name,
                regno: s.regno,
                email: s.email,
                hostelName: s.hostelName,
                teamName:
                  (teamNameByEventAndStudentId[eId] &&
                    teamNameByEventAndStudentId[eId][s._id.toString()]) ||
                  s.teamName,
                department: s.department,
                college: s.college,
                year: s.year,
                registeredAt: r.registeredAt,
              });
            }
          });
        }
      });

      // Attach data
      events.forEach((e) => {
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

    if (ev.imageUrl) {
      return res.redirect(ev.imageUrl);
    }

    const buffer = getLegacyImageBuffer(ev);
    if (buffer) {
      res.set(
        "Content-Type",
        ev.image.contentType || "application/octet-stream",
      );
      res.set("Content-Length", buffer.length);
      return res.send(buffer);
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
    const {
      name,
      email,
      regno,
      branch,
      college,
      year,
      paymentReference,
      transactionId,
      utrNumber,
      paymentScreenshotBase64,
      paymentScreenshotType,
      paymentScreenshotUrl,
    } = req.body || {};

    const ev = await Event.findById(id);
    if (!ev) return res.status(404).json({ error: "Event not found" });

    // Ensure we have at least regno or email to identify student
    if (!regno && !email) {
      return res
        .status(400)
        .json({ error: "Missing student identifier (regno or email)" });
    }

    const normalizedRegno = String(regno || "")
      .trim()
      .toUpperCase();
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (isPaidEvent(ev)) {
      let existingStudent = null;
      if (normalizedRegno) {
        existingStudent = await Student.findOne({ regno: normalizedRegno });
      }
      if (!existingStudent && normalizedEmail) {
        existingStudent = await Student.findOne({ email: normalizedEmail });
      }

      const alreadyRegistered = Array.isArray(existingStudent?.registrations)
        ? existingStudent.registrations.some(
            (entry) =>
              entry.event && entry.event.toString() === ev._id.toString(),
          )
        : false;
      if (alreadyRegistered) {
        return res.status(400).json({ error: "Already registered" });
      }

      const duplicateVerificationConditions = [];
      if (normalizedRegno) {
        duplicateVerificationConditions.push({
          "participant.regno": normalizedRegno,
        });
      }
      if (normalizedEmail) {
        duplicateVerificationConditions.push({
          "participant.email": normalizedEmail,
        });
      }

      if (duplicateVerificationConditions.length > 0) {
        const existingVerification = await PaymentVerification.findOne({
          event: ev._id,
          registrationType: "solo",
          status: { $in: ["submitted", "approved"] },
          $or: duplicateVerificationConditions,
        }).lean();

        if (existingVerification) {
          return res.status(400).json({
            error:
              existingVerification.status === "submitted"
                ? "Payment verification is already pending for this event"
                : "Already registered",
          });
        }
      }

      const activePaymentQr = await getActivePaymentQr(ev._id);
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
          eventId: ev._id,
          registrationType: "solo",
        });

        uploadedPaymentProof = await uploadPaymentProofImage({
          imageBase64: paymentScreenshotBase64,
          imageType: paymentScreenshotType,
          imageUrl: paymentScreenshotUrl,
          eventId: ev._id,
          paymentReference: normalizedReference,
          regno: normalizedRegno,
        });

        const item = await PaymentVerification.create({
          event: ev._id,
          eventTitle: ev.title || "",
          registrationType: "solo",
          paymentReference: reservedReference.reference,
          paymentScreenshotUrl: uploadedPaymentProof.secureUrl,
          paymentScreenshotPublicId: uploadedPaymentProof.publicId,
          paymentAmount: Number(ev.price || 0),
          paymentSubmittedAt: new Date(),
          participant: {
            name: String(name || "").trim(),
            regno: normalizedRegno,
            email: normalizedEmail,
            branch: String(branch || "").trim(),
            college: String(college || "").trim(),
            year: String(year || "").trim(),
          },
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

    let reservedReference = null;
    let uploadedPaymentProof = null;
    if (isPaidEvent(ev)) {
      const activePaymentQr = await getActivePaymentQr(ev._id);
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
        eventId: ev._id,
        registrationType: "solo",
        studentId: student._id,
      });

      try {
        uploadedPaymentProof = await uploadPaymentProofImage({
          imageBase64: paymentScreenshotBase64,
          imageType: paymentScreenshotType,
          imageUrl: paymentScreenshotUrl,
          eventId: ev._id,
          paymentReference: normalizedReference,
          regno: student.regno,
        });
      } catch (paymentErr) {
        await releasePaymentReference(normalizedReference);
        throw paymentErr;
      }
    }

    // Add registration to the student document (normalize registrations to Student collection)
    // store the event title as a denormalized field for easy display
    const registrationEntry = {
      event: ev._id,
      eventName: ev.title || "",
      registeredAt: new Date(),
    };

    if (reservedReference && uploadedPaymentProof) {
      registrationEntry.paymentReference = reservedReference.reference;
      registrationEntry.paymentScreenshotUrl = uploadedPaymentProof.secureUrl;
      registrationEntry.paymentScreenshotPublicId =
        uploadedPaymentProof.publicId;
      registrationEntry.paymentAmount = Number(ev.price || 0);
      registrationEntry.paymentStatus = "submitted";
      registrationEntry.paymentSubmittedAt = new Date();
    }

    student.registrations.push(registrationEntry);

    try {
      await student.save();
    } catch (saveErr) {
      if (reservedReference?.reference) {
        await releasePaymentReference(reservedReference.reference);
      }
      if (uploadedPaymentProof?.publicId) {
        await destroyRegistrationPaymentImage(uploadedPaymentProof.publicId);
      }
      throw saveErr;
    }

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

async function checkPaymentReferenceAvailability(req, res) {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId).select("_id price").lean();
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const reference = normalizePaymentReference(
      req.query.value || req.query.reference,
    );
    if (!reference) {
      return res.status(400).json({
        error: "Transaction ID / UTR number is required",
      });
    }

    const available = await isPaymentReferenceAvailable(reference);
    return res.json({
      available,
      reference,
      paidEvent: isPaidEvent(event),
    });
  } catch (err) {
    console.error("checkPaymentReferenceAvailability error", err);
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
      isMcqEnabled,
      isCodingEnabled,
      questions,
      sessions,
      studentSessions,
      teamMarksConfig,
      examSecurityCode,
      participationType,
      minTeamSize,
      maxTeamSize,
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
          actor && actor.email
            ? String(actor.email).toLowerCase().trim()
            : null;
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
          const normalized = (managers || []).map((m) =>
            String(m).toLowerCase(),
          );
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
    if (isMcqEnabled !== undefined) $set.isMcqEnabled = isMcqEnabled;
    if (isCodingEnabled !== undefined) $set.isCodingEnabled = isCodingEnabled;
    if (questions !== undefined) $set.questions = questions;
    if (examSecurityCode !== undefined)
      $set.examSecurityCode = examSecurityCode || "";

    if (sessions !== undefined) {
      console.log(
        `[updateEvent] Updating sessions for ${id}:`,
        JSON.stringify(sessions),
      );
      $set.sessions = sessions;
    }

    if (studentSessions !== undefined) {
      console.log(
        `[updateEvent] Updating studentSessions for ${id}:`,
        JSON.stringify(studentSessions),
      );
      $set.studentSessions = studentSessions;
    }

    const normalizedTeamMarksConfig =
      teamMarksConfig !== undefined
        ? normalizeTeamMarksConfig(teamMarksConfig)
        : undefined;

    if (normalizedTeamMarksConfig !== undefined) {
      await syncRenamedTeamMarkRounds({
        eventId: ev._id,
        previousConfig: ev.teamMarksConfig,
        nextConfig: normalizedTeamMarksConfig,
        actorId: req.user?.id,
      });
      $set.teamMarksConfig = normalizedTeamMarksConfig;
    }

    if (participationType !== undefined)
      $set.participationType = participationType;
    if (minTeamSize !== undefined) $set.minTeamSize = Number(minTeamSize);
    if (maxTeamSize !== undefined) $set.maxTeamSize = Number(maxTeamSize);

    if (managerEmail !== undefined) {
      if (!managerEmail)
        return res.status(400).json({ error: "managerEmail cannot be empty" });
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(String(managerEmail)))
        return res.status(400).json({ error: "Invalid managerEmail format" });
      $set.managerEmail = String(managerEmail).toLowerCase().trim();
    }

    if (imageBase64 && imageType) {
      const uploadedImage = await uploadIncomingEventImage({
        imageBase64,
        imageType,
        eventId: ev._id.toString(),
        title: title !== undefined ? title : ev.title,
        existingPublicId: ev.cloudinaryPublicId,
      });
      $set.imageUrl = uploadedImage.secureUrl;
      $set.cloudinaryPublicId = uploadedImage.publicId;
      $unset.image = 1;
    } else if (imageUrl !== undefined) {
      if (imageUrl) {
        const uploadedImage = await uploadIncomingEventImage({
          imageUrl,
          eventId: ev._id.toString(),
          title: title !== undefined ? title : ev.title,
          existingPublicId: ev.cloudinaryPublicId,
        });
        $set.imageUrl = uploadedImage.secureUrl;
        $set.cloudinaryPublicId = uploadedImage.publicId;
        $unset.image = 1;
      } else {
        if (ev.cloudinaryPublicId) {
          await destroyEventImage(ev.cloudinaryPublicId);
        }
        $set.imageUrl = "";
        $unset.image = 1;
        $unset.cloudinaryPublicId = 1;
      }
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

    console.log(
      "[updateEvent] Executing update:",
      JSON.stringify(updateOps, (k, v) => (k === "data" ? "<Buffer>" : v)),
    );

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

    if (ev.cloudinaryPublicId) {
      try {
        await destroyEventImage(ev.cloudinaryPublicId);
      } catch (imageErr) {
        console.error("Failed to delete Cloudinary image:", imageErr);
      }
    }

    try {
      await ProblemStatement.deleteMany({ event: ev._id });
    } catch (problemStatementErr) {
      console.error(
        "Failed to delete problem statements for event:",
        problemStatementErr,
      );
    }

    await Event.deleteOne({ _id: ev._id });
    return res.json({ success: true, message: "Event deleted" });
  } catch (err) {
    console.error("deleteEvent error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function generateEventKey(req, res) {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "Missing event id" });
    const ev = await Event.findById(id);
    if (!ev) return res.status(404).json({ error: "Event not found" });

    // Permission: only admins or the event manager can generate keys
    let actor = null;
    if (req.user && req.user.id)
      actor = await User.findById(req.user.id).lean();
    const isAdmin = actor && actor.role === "admin";
    const userEmail =
      actor && actor.email ? String(actor.email).toLowerCase().trim() : null;

    if (
      !isAdmin &&
      (!userEmail || String(ev.managerEmail).toLowerCase().trim() !== userEmail)
    ) {
      return res
        .status(403)
        .json({ error: "Forbidden: Only event managers can generate keys" });
    }

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let key = "";
    for (let i = 0; i < 6; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    ev.accessKey = key;
    await ev.save();

    return res.json({ success: true, accessKey: key });
  } catch (err) {
    console.error("generateEventKey error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function revokeEventKey(req, res) {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "Missing event id" });
    const ev = await Event.findById(id);
    if (!ev) return res.status(404).json({ error: "Event not found" });

    // Permission check
    let actor = null;
    if (req.user && req.user.id)
      actor = await User.findById(req.user.id).lean();
    const isAdmin = actor && actor.role === "admin";
    const userEmail =
      actor && actor.email ? String(actor.email).toLowerCase().trim() : null;

    if (
      !isAdmin &&
      (!userEmail || String(ev.managerEmail).toLowerCase().trim() !== userEmail)
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    ev.accessKey = undefined;
    await ev.save();

    return res.json({ success: true, message: "Key revoked" });
  } catch (err) {
    console.error("revokeEventKey error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  createEvent,
  getEvents,
  getEventImage,
  registerEvent,
  checkPaymentReferenceAvailability,
  updateEvent,
  deleteEvent,
  generateEventKey,
  revokeEventKey,
};
