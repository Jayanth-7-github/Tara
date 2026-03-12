const { Schema, model, Types } = require("mongoose");

const TeamSchema = new Schema(
  {
    event: { type: Types.ObjectId, ref: "Event", required: true },
    name: { type: String, required: true, trim: true },
    leader: { type: Types.ObjectId, ref: "Student", required: true },
    members: [{ type: Types.ObjectId, ref: "Student", required: true }],
    paymentReference: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },
    paymentScreenshotUrl: { type: String, trim: true },
    paymentScreenshotPublicId: { type: String, trim: true },
    paymentAmount: { type: Number, min: 0 },
    paymentStatus: {
      type: String,
      enum: ["submitted", "approved", "rejected"],
    },
    paymentSubmittedAt: { type: Date },
    selectedProblemStatement: {
      type: Types.ObjectId,
      ref: "ProblemStatement",
      default: null,
    },
    selectedProblemStatementBy: {
      type: Types.ObjectId,
      ref: "Student",
      default: null,
    },
    selectedProblemStatementAt: {
      type: Date,
      default: null,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = model("Team", TeamSchema);
