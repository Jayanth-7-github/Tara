const { Schema, model } = require("mongoose");

const DeletedRegistrationSchema = new Schema(
  {
    // Original student data
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    regno: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, trim: true },
    department: { type: String },
    college: { type: String },
    year: { type: String },
    phone: { type: String },
    branch: { type: String },
    hostelName: { type: String },
    roomNo: { type: String },

    // Event data
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    eventTitle: { type: String, required: true },

    // Registration data
    registeredAt: { type: Date, required: true },
    paymentReference: { type: String, trim: true },
    paymentScreenshotUrl: { type: String, trim: true },
    paymentScreenshotPublicId: { type: String, trim: true },
    paymentAmount: { type: Number, min: 0 },
    paymentStatus: {
      type: String,
      enum: ["submitted", "approved", "rejected"],
    },
    paymentSubmittedAt: { type: Date },

    // Deletion metadata
    deletedAt: { type: Date, default: Date.now },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" }, // Event manager who deleted
  },
  { timestamps: true },
);

module.exports = model("DeletedRegistration", DeletedRegistrationSchema);
