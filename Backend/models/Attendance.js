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

const SessionDataSchema = new Schema({
  sessionName: { type: String, required: true },
  timestamp: { type: Date },
  timestampText: { type: String },
  isPresent: { type: Boolean, default: true }
}, { _id: false });

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
    // Map of sessionName -> sessionData
    sessions: {
      type: Map,
      of: SessionDataSchema,
      default: {}
    },
    // Optional reference to Student
    student: { type: Types.ObjectId, ref: "Student", required: false },
  },
  { timestamps: true },
);

// compound index to prevent duplicate documents for same event + regno
AttendanceSchema.index({ regno: 1, eventName: 1 }, { unique: true });

module.exports = model("Attendance", AttendanceSchema);
