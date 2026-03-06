const { Schema, model, Types } = require("mongoose");

const StudentAttendanceSchema = new Schema(
  {
    event: { type: Types.ObjectId, ref: "Event", required: true, index: true },
    team: { type: Types.ObjectId, ref: "Team", required: true, index: true },
    student: {
      type: Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    // free-form session label (e.g., "Session 1", "Day 2 - Morning")
    sessionName: { type: String, required: true, trim: true, index: true },

    // Store a data URL so frontend can render without auth-gated image fetches.
    // Expected: data:<mime>;base64,<...>
    photoDataUrl: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    // If true, a previously rejected record may be resubmitted by the student.
    allowResubmit: { type: Boolean, default: false, index: true },

    submittedBy: { type: Types.ObjectId, ref: "User" },

    reviewedBy: { type: Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewComment: { type: String, trim: true },
  },
  { timestamps: true },
);

// One attendance submission per student per team per session per event.
StudentAttendanceSchema.index(
  { event: 1, team: 1, student: 1, sessionName: 1 },
  { unique: true },
);

module.exports = model("StudentAttendance", StudentAttendanceSchema);
