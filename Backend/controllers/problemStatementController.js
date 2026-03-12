const Event = require("../models/Event");
const ProblemStatement = require("../models/ProblemStatement");
const RoleConfig = require("../models/RoleConfig");
const Team = require("../models/Team");
const User = require("../models/User");

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeLongText(value) {
  return String(value || "").trim();
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
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

  const actorEmail = normalizeText(actor.email).toLowerCase();
  const managerEmail = normalizeText(event.managerEmail).toLowerCase();
  if (actorEmail && managerEmail && actorEmail === managerEmail) {
    return { actor, event };
  }

  const roleConfig = await RoleConfig.findOne().lean();
  const managerKeys = [
    String(event._id || ""),
    normalizeText(event.title),
  ].filter(Boolean);
  const allowedManagers = getManagersFromRoleConfig(roleConfig, managerKeys);

  if (actorEmail && allowedManagers.includes(actorEmail)) {
    return { actor, event };
  }

  res.status(403).json({ error: "Forbidden" });
  return null;
}

function buildPayload(body, { partial = false } = {}) {
  const payload = {};
  const errors = [];

  if (!partial || body.title !== undefined) {
    const title = normalizeText(body.title);
    if (!title) {
      errors.push("Title is required");
    } else {
      payload.title = title;
    }
  }

  const descriptionSource =
    body.description !== undefined ? body.description : body.statement;

  if (!partial || descriptionSource !== undefined) {
    const description = normalizeLongText(descriptionSource);
    if (!description) {
      errors.push("Description is required");
    } else {
      payload.description = description;
    }
  }

  if (body.order !== undefined && body.order !== null && body.order !== "") {
    const order = Number(body.order);
    if (!Number.isFinite(order) || order < 0) {
      errors.push("Display order must be a non-negative number");
    } else {
      payload.order = Math.floor(order);
    }
  }

  if (!partial || body.isActive !== undefined) {
    payload.isActive = normalizeBoolean(body.isActive, true);
  }

  return { errors, payload };
}

async function listProblemStatements(req, res) {
  try {
    const eventId = normalizeText(req.query.eventId);
    if (!eventId) {
      return res.status(400).json({ error: "eventId is required" });
    }

    const access = await requireManagedEvent(req, res, eventId);
    if (!access) return;

    const activeOnly = normalizeBoolean(req.query.activeOnly, false);
    const filter = { event: access.event._id };
    if (activeOnly) {
      filter.isActive = true;
    }

    const items = await ProblemStatement.find(filter)
      .sort({ order: 1, updatedAt: -1, createdAt: -1 })
      .lean();

    const normalizedItems = items.map((item) => ({
      ...item,
      description: normalizeLongText(item.description || item.statement),
    }));

    return res.json({ items: normalizedItems });
  } catch (err) {
    console.error("listProblemStatements error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function createProblemStatement(req, res) {
  try {
    const eventId = normalizeText(req.body?.eventId);
    if (!eventId) {
      return res.status(400).json({ error: "eventId is required" });
    }

    const access = await requireManagedEvent(req, res, eventId);
    if (!access) return;

    const { errors, payload } = buildPayload(req.body || {});
    if (errors.length) {
      return res.status(400).json({ error: errors[0], details: errors });
    }

    if (payload.order === undefined) {
      payload.order = await ProblemStatement.countDocuments({
        event: access.event._id,
      });
    }

    const item = await ProblemStatement.create({
      ...payload,
      event: access.event._id,
      createdBy: access.actor._id,
      updatedBy: access.actor._id,
    });

    return res.status(201).json({ success: true, item });
  } catch (err) {
    console.error("createProblemStatement error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function updateProblemStatement(req, res) {
  try {
    const statementId = req.params.id;
    const existing = await ProblemStatement.findById(statementId).lean();
    if (!existing) {
      return res.status(404).json({ error: "Problem statement not found" });
    }

    const access = await requireManagedEvent(req, res, existing.event);
    if (!access) return;

    const { errors, payload } = buildPayload(req.body || {}, { partial: true });
    if (errors.length) {
      return res.status(400).json({ error: errors[0], details: errors });
    }

    const item = await ProblemStatement.findByIdAndUpdate(
      statementId,
      {
        $set: {
          ...payload,
          updatedBy: access.actor._id,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    return res.json({ success: true, item });
  } catch (err) {
    console.error("updateProblemStatement error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function deleteProblemStatement(req, res) {
  try {
    const statementId = req.params.id;
    const existing = await ProblemStatement.findById(statementId).lean();
    if (!existing) {
      return res.status(404).json({ error: "Problem statement not found" });
    }

    const access = await requireManagedEvent(req, res, existing.event);
    if (!access) return;

    const alreadySelected = await Team.exists({
      selectedProblemStatement: existing._id,
    });
    if (alreadySelected) {
      return res.status(409).json({
        error:
          "This problem statement has already been selected by a team and cannot be deleted",
      });
    }

    await ProblemStatement.deleteOne({ _id: statementId });
    return res.json({ success: true, message: "Problem statement deleted" });
  } catch (err) {
    console.error("deleteProblemStatement error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function toggleAllProblemStatements(req, res) {
  try {
    const eventId = normalizeText(req.body?.eventId);
    if (!eventId) {
      return res.status(400).json({ error: "eventId is required" });
    }

    const access = await requireManagedEvent(req, res, eventId);
    if (!access) return;

    const nextStatus = normalizeBoolean(req.body?.isActive, false);
    const result = await ProblemStatement.updateMany(
      { event: access.event._id },
      {
        $set: {
          isActive: nextStatus,
          updatedBy: access.actor._id,
        },
      },
    );

    return res.json({
      success: true,
      updatedCount: result.modifiedCount || 0,
      isActive: nextStatus,
    });
  } catch (err) {
    console.error("toggleAllProblemStatements error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  listProblemStatements,
  createProblemStatement,
  updateProblemStatement,
  deleteProblemStatement,
  toggleAllProblemStatements,
};
