const { Schema, model, Types } = require("mongoose");

const PaymentReferenceSchema = new Schema(
  {
    reference: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },
    event: { type: Types.ObjectId, ref: "Event", required: true },
    registrationType: {
      type: String,
      enum: ["solo", "team"],
      required: true,
    },
    student: { type: Types.ObjectId, ref: "Student", default: null },
    team: { type: Types.ObjectId, ref: "Team", default: null },
  },
  { timestamps: true },
);

module.exports = model("PaymentReference", PaymentReferenceSchema);
