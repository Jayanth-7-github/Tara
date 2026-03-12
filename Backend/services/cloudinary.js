const { v2: cloudinary } = require("cloudinary");

const configured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET,
);

if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

function ensureConfigured() {
  if (!configured) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }
}

function sanitizeSegment(value) {
  const cleaned = String(value || "event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  return cleaned || "event";
}

function getEventFolder() {
  return process.env.CLOUDINARY_EVENT_FOLDER || "tara/events";
}

function getAttendanceFolder() {
  return process.env.CLOUDINARY_ATTENDANCE_FOLDER || "tara/student-attendance";
}

function getPaymentQrFolder() {
  return process.env.CLOUDINARY_PAYMENT_QR_FOLDER || "tara/payment-qrs";
}

function getRegistrationPaymentFolder() {
  return (
    process.env.CLOUDINARY_REGISTRATION_PAYMENT_FOLDER ||
    "tara/registration-payments"
  );
}

async function uploadImage(source, publicId) {
  ensureConfigured();

  const result = await cloudinary.uploader.upload(source, {
    resource_type: "image",
    public_id: publicId,
    overwrite: true,
    invalidate: true,
  });

  return {
    publicId: result.public_id,
    secureUrl: result.secure_url || result.url,
  };
}

async function uploadEventImage(source, options = {}) {
  const eventId = sanitizeSegment(options.eventId || Date.now());
  const title = sanitizeSegment(options.title || "event");
  const publicId =
    options.existingPublicId || `${getEventFolder()}/${title}-${eventId}`;

  return uploadImage(source, publicId);
}

async function uploadStudentAttendanceImage(source, options = {}) {
  const eventId = sanitizeSegment(options.eventId || "event");
  const teamId = sanitizeSegment(options.teamId || "team");
  const studentId = sanitizeSegment(options.studentId || "student");
  const sessionName = sanitizeSegment(options.sessionName || Date.now());
  const publicId =
    options.existingPublicId ||
    `${getAttendanceFolder()}/${eventId}-${teamId}-${studentId}-${sessionName}`;

  return uploadImage(source, publicId);
}

async function uploadPaymentQrImage(source, options = {}) {
  const eventId = sanitizeSegment(options.eventId || "event");
  const title = sanitizeSegment(options.title || "payment-qr");
  const timestamp = sanitizeSegment(options.timestamp || Date.now());
  const publicId =
    options.existingPublicId ||
    `${getPaymentQrFolder()}/${title}-${eventId}-${timestamp}`;

  return uploadImage(source, publicId);
}

async function uploadRegistrationPaymentImage(source, options = {}) {
  const eventId = sanitizeSegment(options.eventId || "event");
  const paymentReference = sanitizeSegment(
    options.paymentReference || Date.now(),
  );
  const regno = sanitizeSegment(options.regno || "student");
  const teamName = sanitizeSegment(options.teamName || "team");
  const publicId =
    options.existingPublicId ||
    `${getRegistrationPaymentFolder()}/${eventId}-${teamName}-${regno}-${paymentReference}`;

  return uploadImage(source, publicId);
}

async function destroyEventImage(publicId) {
  if (!configured || !publicId) {
    return;
  }

  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
}

module.exports = {
  isCloudinaryConfigured: () => configured,
  uploadEventImage,
  uploadStudentAttendanceImage,
  uploadPaymentQrImage,
  uploadRegistrationPaymentImage,
  destroyEventImage,
  destroyPaymentQrImage: destroyEventImage,
  destroyRegistrationPaymentImage: destroyEventImage,
};
