const { Schema, model, Types } = require("mongoose");

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
    timestamp: { type: Date, default: () => new Date(), required: true },
    isPresent: { type: Boolean, default: true },
    // optional reference to Student
    student: { type: Types.ObjectId, ref: "Student", required: false },
  },
  { timestamps: true }
);

// compound index to prevent double-marking for same event + regno
AttendanceSchema.index({ regno: 1, eventName: 1 }, { unique: false });

module.exports = model("Attendance", AttendanceSchema);
