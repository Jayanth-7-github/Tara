const Event = require("../models/Event");
const PaymentQr = require("../models/PaymentQr");
const RoleConfig = require("../models/RoleConfig");
const User = require("../models/User");
const {
  destroyPaymentQrImage,
  isCloudinaryConfigured,
  uploadPaymentQrImage,
} = require("../services/cloudinary");

function extractBase64Payload(raw) {
  const value = String(raw || "");
  const match = value.match(/^data:([^;]+);base64,(.*)$/);
  return {
    mime: match ? match[1] : null,
    base64: match ? match[2] : value,
  };
}

function estimateBytesFromBase64(base64) {
  const value = String(base64 || "");
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.floor((value.length * 3) / 4) - padding;
}

function buildDataUrl(raw, mime) {
  const value = String(raw || "");
  if (value.startsWith("data:")) {
    return value;
  }

  return `data:${mime || "application/octet-stream"};base64,${value}`;
}

function normalizeText(value) {
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

async function uploadIncomingPaymentQrImage({
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

  return uploadPaymentQrImage(source, {
    eventId,
    title,
    existingPublicId,
  });
}

async function listPaymentQrs(req, res) {
  try {
    const eventId = normalizeText(req.query.eventId);
    if (!eventId) {
      return res.status(400).json({ error: "eventId is required" });
    }

    const access = await requireManagedEvent(req, res, eventId);
    if (!access) return;

    const items = await PaymentQr.find({ event: access.event._id })
      .sort({ isActive: -1, updatedAt: -1, createdAt: -1 })
      .lean();

    return res.json({ items });
  } catch (err) {
    console.error("listPaymentQrs error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function getActivePaymentQr(req, res) {
  try {
    const eventId = normalizeText(req.query.eventId);
    if (!eventId) {
      return res.status(400).json({ error: "eventId is required" });
    }

    const event = await Event.findById(eventId).select("_id").lean();
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const item = await PaymentQr.findOne({ event: event._id, isActive: true })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    return res.json({ item: item || null });
  } catch (err) {
    console.error("getActivePaymentQr error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function createPaymentQr(req, res) {
  try {
    const eventId = normalizeText(req.body?.eventId);
    const title = normalizeText(req.body?.title);
    const shouldActivate = normalizeBoolean(req.body?.isActive, false);

    if (!eventId) {
      return res.status(400).json({ error: "eventId is required" });
    }

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const access = await requireManagedEvent(req, res, eventId);
    if (!access) return;

    const uploadedImage = await uploadIncomingPaymentQrImage({
      imageBase64: req.body?.imageBase64,
      imageType: req.body?.imageType,
      imageUrl: req.body?.imageUrl,
      eventId: access.event._id,
      title,
    });

    if (!uploadedImage?.secureUrl) {
      return res.status(400).json({ error: "QR image is required" });
    }

    if (shouldActivate) {
      await PaymentQr.updateMany(
        { event: access.event._id, isActive: true },
        { $set: { isActive: false, updatedBy: access.actor._id } },
      );
    }

    const item = await PaymentQr.create({
      event: access.event._id,
      title,
      imageUrl: uploadedImage.secureUrl,
      cloudinaryPublicId: uploadedImage.publicId,
      isActive: shouldActivate,
      createdBy: access.actor._id,
      updatedBy: access.actor._id,
    });

    return res.status(201).json({ success: true, item });
  } catch (err) {
    console.error("createPaymentQr error", err);
    const status = err?.status || (err?.code === 11000 ? 409 : 500);
    const errorMessage =
      err?.code === 11000
        ? "Only one QR can stay active for an event."
        : err?.message || "Internal server error";
    return res.status(status).json({ error: errorMessage });
  }
}

async function updatePaymentQrStatus(req, res) {
  try {
    const qrId = req.params.id;
    const existing = await PaymentQr.findById(qrId);
    if (!existing) {
      return res.status(404).json({ error: "Payment QR not found" });
    }

    const access = await requireManagedEvent(req, res, existing.event);
    if (!access) return;

    const shouldActivate = normalizeBoolean(
      req.body?.isActive,
      existing.isActive,
    );

    if (shouldActivate) {
      await PaymentQr.updateMany(
        {
          event: existing.event,
          _id: { $ne: existing._id },
          isActive: true,
        },
        { $set: { isActive: false, updatedBy: access.actor._id } },
      );
    }

    existing.isActive = shouldActivate;
    existing.updatedBy = access.actor._id;
    await existing.save();

    return res.json({ success: true, item: existing });
  } catch (err) {
    console.error("updatePaymentQrStatus error", err);
    const status = err?.status || (err?.code === 11000 ? 409 : 500);
    const errorMessage =
      err?.code === 11000
        ? "Only one QR can stay active for an event."
        : err?.message || "Internal server error";
    return res.status(status).json({ error: errorMessage });
  }
}

async function deletePaymentQr(req, res) {
  try {
    const qrId = req.params.id;
    const existing = await PaymentQr.findById(qrId);
    if (!existing) {
      return res.status(404).json({ error: "Payment QR not found" });
    }

    const access = await requireManagedEvent(req, res, existing.event);
    if (!access) return;

    if (existing.cloudinaryPublicId) {
      await destroyPaymentQrImage(existing.cloudinaryPublicId);
    }

    await existing.deleteOne();

    return res.json({ success: true });
  } catch (err) {
    console.error("deletePaymentQr error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  listPaymentQrs,
  getActivePaymentQr,
  createPaymentQr,
  updatePaymentQrStatus,
  deletePaymentQr,
};
