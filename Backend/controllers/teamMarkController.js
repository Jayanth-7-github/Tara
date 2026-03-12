const Event = require("../models/Event");
const Team = require("../models/Team");
const TeamMark = require("../models/TeamMark");
const User = require("../models/User");
const RoleConfig = require("../models/RoleConfig");

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isGroupedMarkDoc(doc) {
  return Array.isArray(doc?.categories);
}

function isLegacyMarkDoc(doc) {
  return Boolean(String(doc?.criteriaType || "").trim());
}

function sortByUpdatedAt(left, right) {
  return (
    new Date(left?.updatedAt || 0).getTime() -
    new Date(right?.updatedAt || 0).getTime()
  );
}

function normalizeRoundCategories(inputCategories = []) {
  if (!Array.isArray(inputCategories)) {
    throw createHttpError(400, "categories must be an array");
  }

  const seen = new Set();
  const normalized = [];

  for (const category of inputCategories) {
    const criteriaType = String(
      category?.criteriaType || category?.name || "",
    ).trim();
    const criteriaKey = normalizeKey(criteriaType);

    if (!criteriaType) {
      throw createHttpError(400, "Each category needs a name");
    }
    if (seen.has(criteriaKey)) {
      throw createHttpError(400, `Duplicate category: ${criteriaType}`);
    }

    const score = Number(category?.score);
    const maxScore = Number(category?.maxScore);

    if (!Number.isFinite(score) || score < 0) {
      throw createHttpError(400, `Invalid score for ${criteriaType}`);
    }
    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      throw createHttpError(400, `Invalid max score for ${criteriaType}`);
    }
    if (score > maxScore) {
      throw createHttpError(
        400,
        `${criteriaType} score cannot be greater than max score`,
      );
    }

    seen.add(criteriaKey);
    normalized.push({
      criteriaType,
      criteriaKey,
      score,
      maxScore,
    });
  }

  if (!normalized.length) {
    throw createHttpError(400, "Add at least one category score");
  }

  return normalized;
}

function collectCategoriesFromDocs(docs = []) {
  const sortedDocs = [...docs].sort(sortByUpdatedAt);
  const categoriesByKey = new Map();

  for (const doc of sortedDocs) {
    if (isGroupedMarkDoc(doc)) {
      for (const category of Array.isArray(doc.categories)
        ? doc.categories
        : []) {
        const criteriaType = String(category?.criteriaType || "").trim();
        const criteriaKey = normalizeKey(criteriaType || category?.criteriaKey);
        if (!criteriaType || !criteriaKey) continue;

        categoriesByKey.set(criteriaKey, {
          criteriaType,
          criteriaKey,
          score: Number(category?.score || 0),
          maxScore: Number(category?.maxScore || 0),
        });
      }
      continue;
    }

    if (!isLegacyMarkDoc(doc)) continue;

    const criteriaType = String(doc.criteriaType || "").trim();
    const criteriaKey = normalizeKey(criteriaType || doc.criteriaKey);
    if (!criteriaType || !criteriaKey) continue;

    categoriesByKey.set(criteriaKey, {
      criteriaType,
      criteriaKey,
      score: Number(doc.score || 0),
      maxScore: Number(doc.maxScore || 0),
    });
  }

  return Array.from(categoriesByKey.values());
}

function pickRoundNotes(docs = []) {
  const sortedDocs = [...docs].sort(sortByUpdatedAt).reverse();
  const withNotes = sortedDocs.find((doc) => String(doc?.notes || "").trim());
  return String(withNotes?.notes || "").trim();
}

function flattenTeamMarks(docs = []) {
  const flattened = [];

  for (const doc of docs) {
    const base = {
      event: doc?.event,
      team: doc?.team,
      roundName: String(doc?.roundName || "").trim(),
      roundKey: String(doc?.roundKey || normalizeKey(doc?.roundName)).trim(),
      notes: String(doc?.notes || "").trim(),
      createdAt: doc?.createdAt,
      updatedAt: doc?.updatedAt,
      createdBy: doc?.createdBy,
      updatedBy: doc?.updatedBy,
      roundMarkId: doc?._id,
    };

    if (isGroupedMarkDoc(doc)) {
      for (const category of Array.isArray(doc.categories)
        ? doc.categories
        : []) {
        const criteriaType = String(category?.criteriaType || "").trim();
        if (!criteriaType) continue;

        flattened.push({
          ...base,
          _id: category?._id || doc?._id,
          criteriaType,
          criteriaKey: String(
            category?.criteriaKey || normalizeKey(criteriaType),
          ).trim(),
          score: Number(category?.score || 0),
          maxScore: Number(category?.maxScore || 0),
        });
      }
      continue;
    }

    if (!isLegacyMarkDoc(doc)) continue;

    const criteriaType = String(doc.criteriaType || "").trim();
    flattened.push({
      ...base,
      _id: doc?._id,
      criteriaType,
      criteriaKey: String(
        doc?.criteriaKey || normalizeKey(criteriaType),
      ).trim(),
      score: Number(doc?.score || 0),
      maxScore: Number(doc?.maxScore || 0),
    });
  }

  return flattened.sort((left, right) => {
    const roundCompare = String(left.roundName || "").localeCompare(
      String(right.roundName || ""),
      undefined,
      { sensitivity: "base", numeric: true },
    );
    if (roundCompare !== 0) return roundCompare;

    const categoryCompare = String(left.criteriaType || "").localeCompare(
      String(right.criteriaType || ""),
      undefined,
      { sensitivity: "base", numeric: true },
    );
    if (categoryCompare !== 0) return categoryCompare;

    return (
      new Date(right.updatedAt || 0).getTime() -
      new Date(left.updatedAt || 0).getTime()
    );
  });
}

async function migrateLegacyMarks(query) {
  const docs = await TeamMark.find(query)
    .sort({ updatedAt: 1, createdAt: 1 })
    .lean();
  if (!docs.some(isLegacyMarkDoc)) {
    return;
  }

  const groups = new Map();

  for (const doc of docs) {
    const roundName = String(doc?.roundName || "").trim();
    const roundKey = String(doc?.roundKey || normalizeKey(roundName)).trim();
    const groupKey = [doc?.event, doc?.team, roundKey].map(String).join(":");

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        event: doc?.event,
        team: doc?.team,
        roundName,
        roundKey,
        docs: [],
      });
    }

    groups.get(groupKey).docs.push(doc);
  }

  for (const group of groups.values()) {
    const legacyDocs = group.docs.filter(isLegacyMarkDoc);
    if (!legacyDocs.length) continue;

    const groupedDoc = group.docs.find(isGroupedMarkDoc) || null;
    const categories = collectCategoriesFromDocs(group.docs);

    if (!categories.length) continue;

    const payload = {
      event: group.event,
      team: group.team,
      roundName: group.roundName,
      roundKey: group.roundKey,
      categories,
      notes: pickRoundNotes(group.docs),
      createdBy: groupedDoc?.createdBy || legacyDocs[0]?.createdBy,
      updatedBy:
        groupedDoc?.updatedBy || legacyDocs[legacyDocs.length - 1]?.updatedBy,
    };

    if (groupedDoc?._id) {
      await TeamMark.findByIdAndUpdate(
        groupedDoc._id,
        { $set: payload },
        { runValidators: true },
      );
    } else {
      await TeamMark.create(payload);
    }

    await TeamMark.deleteMany({
      _id: { $in: legacyDocs.map((doc) => doc._id) },
    });
  }
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
    const normalized = list.map((entry) => String(entry).toLowerCase().trim());
    return normalized.includes(actorEmail);
  } catch (error) {
    return false;
  }
}

async function requireManagedEvent(req, res) {
  const actor = await getActor(req);
  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const eventId = req.query.eventId || req.body.eventId;
  if (!eventId) {
    res.status(400).json({ error: "eventId is required" });
    return null;
  }

  const event = await Event.findById(eventId).lean();
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return null;
  }

  const allowed = await isEventManagerForEvent({ actor, eventDoc: event });
  if (!allowed) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }

  return { actor, event };
}

exports.listTeamMarks = async (req, res) => {
  try {
    const context = await requireManagedEvent(req, res);
    if (!context) return;

    const query = { event: context.event._id };
    if (req.query.teamId) query.team = req.query.teamId;

    await migrateLegacyMarks(query);

    const documents = await TeamMark.find(query)
      .populate({ path: "team", select: "name leader members" })
      .sort({ roundName: 1, updatedAt: -1 })
      .lean();

    const marks = flattenTeamMarks(documents);

    return res.json({ marks });
  } catch (err) {
    console.error("listTeamMarks error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.upsertTeamMark = async (req, res) => {
  try {
    const context = await requireManagedEvent(req, res);
    if (!context) return;

    const { teamId, roundName, notes } = req.body || {};

    if (!teamId) {
      return res.status(400).json({ error: "teamId is required" });
    }

    const normalizedRound = String(roundName || "").trim();
    if (!normalizedRound) {
      return res.status(400).json({
        error: "roundName is required",
      });
    }

    const team = await Team.findById(teamId).lean();
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    if (String(team.event) !== String(context.event._id)) {
      return res.status(400).json({ error: "Team does not belong to event" });
    }

    let categories;
    try {
      const payloadCategories = Array.isArray(req.body?.categories)
        ? req.body.categories
        : [
            {
              criteriaType: req.body?.criteriaType,
              score: req.body?.score,
              maxScore: req.body?.maxScore,
            },
          ];
      categories = normalizeRoundCategories(payloadCategories);
    } catch (validationError) {
      return res.status(validationError.status || 400).json({
        error: validationError.message || "Invalid team mark payload",
      });
    }

    const roundKey = normalizeKey(normalizedRound);

    await migrateLegacyMarks({
      event: context.event._id,
      team: team._id,
      roundKey,
    });

    const filter = { event: context.event._id, team: team._id, roundKey };

    const update = {
      $set: {
        event: context.event._id,
        team: team._id,
        roundName: normalizedRound,
        roundKey,
        categories,
        notes: String(notes || "").trim(),
        updatedBy: context.actor._id,
      },
      $setOnInsert: {
        createdBy: context.actor._id,
      },
    };

    const mark = await TeamMark.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }).populate({ path: "team", select: "name leader members" });

    return res.json({
      message: "Team marks saved successfully",
      mark,
      marks: flattenTeamMarks([mark.toObject ? mark.toObject() : mark]),
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: "A round mark already exists" });
    }
    console.error("upsertTeamMark error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteTeamMark = async (req, res) => {
  try {
    const actor = await getActor(req);
    if (!actor) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let doc = await TeamMark.findOne({
      "categories._id": req.params.id,
    }).lean();
    let deleteCategoryOnly = true;

    if (!doc) {
      doc = await TeamMark.findById(req.params.id).lean();
      deleteCategoryOnly = false;
    }
    if (!doc) {
      return res.status(404).json({ error: "Mark not found" });
    }

    const event = await Event.findById(doc.event).lean();
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const allowed = await isEventManagerForEvent({ actor, eventDoc: event });
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (deleteCategoryOnly && isGroupedMarkDoc(doc)) {
      const nextCategories = (
        Array.isArray(doc.categories) ? doc.categories : []
      ).filter(
        (category) => String(category?._id || "") !== String(req.params.id),
      );

      if (!nextCategories.length) {
        await TeamMark.findByIdAndDelete(doc._id);
      } else {
        await TeamMark.findByIdAndUpdate(doc._id, {
          $set: {
            categories: nextCategories,
            updatedBy: actor._id,
          },
        });
      }
    } else {
      await TeamMark.findByIdAndDelete(doc._id);
    }

    return res.json({ message: "Team mark deleted successfully" });
  } catch (err) {
    console.error("deleteTeamMark error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
