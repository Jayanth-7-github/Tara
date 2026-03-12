const { Schema, model, Types } = require("mongoose");

const ParticipantSnapshotSchema = new Schema(
  {
    name: { type: String, trim: true, default: "" },
    regno: { type: String, trim: true, uppercase: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    branch: { type: String, trim: true, default: "" },
    section: { type: String, trim: true, default: "" },
    college: { type: String, trim: true, default: "" },
    year: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const PaymentVerificationSchema = new Schema(
  {
    event: { type: Types.ObjectId, ref: "Event", required: true, index: true },
    eventTitle: { type: String, trim: true, default: "" },
    registrationType: {
      type: String,
      enum: ["solo", "team"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["submitted", "approved", "rejected"],
      default: "submitted",
      index: true,
    },
    paymentReference: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    paymentScreenshotUrl: { type: String, trim: true, default: "" },
    paymentScreenshotPublicId: { type: String, trim: true, default: "" },
    paymentAmount: { type: Number, required: true, min: 0 },
    paymentSubmittedAt: { type: Date, default: Date.now },
    participant: { type: ParticipantSnapshotSchema, default: undefined },
    teamName: { type: String, trim: true, default: "" },
    leader: { type: ParticipantSnapshotSchema, default: undefined },
    members: { type: [ParticipantSnapshotSchema], default: [] },
    approvedStudent: { type: Types.ObjectId, ref: "Student", default: null },
    approvedTeam: { type: Types.ObjectId, ref: "Team", default: null },
    reviewedBy: { type: Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

PaymentVerificationSchema.index({ event: 1, status: 1, registrationType: 1 });
PaymentVerificationSchema.index({ event: 1, teamName: 1 });
PaymentVerificationSchema.index({ event: 1, "leader.regno": 1 });
PaymentVerificationSchema.index({ event: 1, "participant.regno": 1 });

module.exports = model("PaymentVerification", PaymentVerificationSchema);
