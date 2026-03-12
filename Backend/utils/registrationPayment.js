const PaymentQr = require("../models/PaymentQr");
const PaymentReference = require("../models/PaymentReference");
const {
  isCloudinaryConfigured,
  uploadRegistrationPaymentImage,
} = require("../services/cloudinary");

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizePaymentReference(value) {
  return normalizeText(value).replace(/\s+/g, "").toUpperCase();
}

function isPaidEvent(event) {
  return Number(event?.price || 0) > 0;
}

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

async function getActivePaymentQr(eventId) {
  if (!eventId) return null;

  return PaymentQr.findOne({ event: eventId, isActive: true })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();
}

async function isPaymentReferenceAvailable(reference) {
  const normalizedReference = normalizePaymentReference(reference);
  if (!normalizedReference) return false;

  const existing = await PaymentReference.exists({
    reference: normalizedReference,
  });
  return !existing;
}

async function reservePaymentReference({
  reference,
  eventId,
  registrationType,
  studentId,
  teamId,
}) {
  const normalizedReference = normalizePaymentReference(reference);
  if (!normalizedReference) {
    const error = new Error("Transaction ID / UTR number is required");
    error.status = 400;
    throw error;
  }

  try {
    return await PaymentReference.create({
      reference: normalizedReference,
      event: eventId,
      registrationType,
      student: studentId || null,
      team: teamId || null,
    });
  } catch (err) {
    if (err?.code === 11000) {
      const error = new Error("Transaction ID / UTR number already exists");
      error.status = 409;
      throw error;
    }

    throw err;
  }
}

async function releasePaymentReference(reference) {
  const normalizedReference = normalizePaymentReference(reference);
  if (!normalizedReference) return;

  await PaymentReference.deleteOne({ reference: normalizedReference });
}

async function uploadPaymentProofImage({
  imageBase64,
  imageType,
  imageUrl,
  eventId,
  paymentReference,
  regno,
  teamName,
}) {
  if (!imageBase64 && !imageUrl) {
    const error = new Error("Payment screenshot is required");
    error.status = 400;
    throw error;
  }

  if (!isCloudinaryConfigured()) {
    const error = new Error(
      "Payment screenshot uploads require Cloudinary to be configured on the server.",
    );
    error.status = 500;
    throw error;
  }

  let source = null;
  if (imageBase64) {
    const parsed = extractBase64Payload(imageBase64);
    const byteSize = estimateBytesFromBase64(parsed.base64);
    if (byteSize > 5 * 1024 * 1024) {
      const error = new Error("Payment screenshot size exceeds 5MB limit");
      error.status = 400;
      throw error;
    }

    source = buildDataUrl(imageBase64, imageType || parsed.mime);
  } else {
    source = imageUrl;
  }

  return uploadRegistrationPaymentImage(source, {
    eventId,
    paymentReference,
    regno,
    teamName,
  });
}

module.exports = {
  normalizePaymentReference,
  isPaidEvent,
  getActivePaymentQr,
  isPaymentReferenceAvailable,
  reservePaymentReference,
  releasePaymentReference,
  uploadPaymentProofImage,
};
