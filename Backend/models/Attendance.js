const { Schema, model, Types } = require("mongoose");

// Ensure timestamp only stores up to minutes (no seconds/millis)
function roundToMinute(input) {
  const d = input instanceof Date ? new Date(input) : new Date(input);
  if (isNaN(d.getTime())) return d;
  d.setSeconds(0, 0);
  return d;
}

// Format Date to local "YYYY-MM-DD HH:mm"
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

// Parse local "YYYY-MM-DD HH:mm" to Date (local timezone)
function parseYMDHM(str) {
  if (typeof str !== "string") return null;
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) return null;
  const [_, yy, mo, dd, hh, mm] = m;
  return new Date(
    Number(yy),
    Number(mo) - 1,
    Number(dd),
    Number(hh),
    Number(mm),
    0,
    0,
  );
}

const AttendanceSchema = new Schema(
  {
    regno: { type: String, required: true, index: true },
    name: { type: String },
    eventName: {
      type: String,
      default: "default",
      required: true,
      index: true,
    },
    // store timestamp rounded to minutes for easier updates/reads
    timestamp: {
      type: Date,
      default: () => roundToMinute(new Date()),
      required: true,
    },
    // store a human-friendly local string for easy reads/exports
    timestampText: { type: String },

    // Check-in / Check-out tracking
    checkInAt: { type: Date },
    checkInText: { type: String },
    checkOutAt: { type: Date },
    checkOutText: { type: String },

    // default to absent until explicitly marked present
    isPresent: { type: Boolean, default: false },
    // optional reference to Student
    student: { type: Types.ObjectId, ref: "Student", required: false },
  },
  { timestamps: true },
);

// compound index to prevent double-marking for same event + regno
AttendanceSchema.index({ regno: 1, eventName: 1 }, { unique: false });

// Normalize timestamp to minute precision on saves and updates
AttendanceSchema.pre("save", function (next) {
  if (!this.timestamp) {
    this.timestamp = roundToMinute(new Date());
  } else {
    this.timestamp = roundToMinute(this.timestamp);
  }
  this.timestampText = formatLocalYMDHM(this.timestamp);

  if (this.checkInAt) {
    this.checkInAt = roundToMinute(this.checkInAt);
    this.checkInText = formatLocalYMDHM(this.checkInAt);
  }
  if (this.checkOutAt) {
    this.checkOutAt = roundToMinute(this.checkOutAt);
    this.checkOutText = formatLocalYMDHM(this.checkOutAt);
  }
  next();
});

AttendanceSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  // If timestampText is provided without timestamp, parse it to a Date
  if (!update.timestamp && update.timestampText) {
    const parsed = parseYMDHM(update.timestampText);
    if (parsed) update.timestamp = parsed;
  }
  if (update.timestamp) {
    update.timestamp = roundToMinute(update.timestamp);
  }
  if (update.$set && update.$set.timestamp) {
    update.$set.timestamp = roundToMinute(update.$set.timestamp);
  }
  // Ensure timestampText mirrors timestamp if present in update
  const nextTimestamp = update.$set?.timestamp || update.timestamp;
  if (nextTimestamp) {
    const t = roundToMinute(nextTimestamp);
    if (update.$set) update.$set.timestampText = formatLocalYMDHM(t);
    else update.timestampText = formatLocalYMDHM(t);
  }

  // Normalize check-in/out timestamps and mirror their text fields
  const nextCheckIn = update.$set?.checkInAt || update.checkInAt;
  if (nextCheckIn) {
    const t = roundToMinute(nextCheckIn);
    if (update.$set) {
      update.$set.checkInAt = t;
      update.$set.checkInText = formatLocalYMDHM(t);
    } else {
      update.checkInAt = t;
      update.checkInText = formatLocalYMDHM(t);
    }
  }

  const nextCheckOut = update.$set?.checkOutAt || update.checkOutAt;
  if (nextCheckOut) {
    const t = roundToMinute(nextCheckOut);
    if (update.$set) {
      update.$set.checkOutAt = t;
      update.$set.checkOutText = formatLocalYMDHM(t);
    } else {
      update.checkOutAt = t;
      update.checkOutText = formatLocalYMDHM(t);
    }
  }

  this.setUpdate(update);
  next();
});

module.exports = model("Attendance", AttendanceSchema);
