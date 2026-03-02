const { Schema, model, Types } = require("mongoose");

const TeamSchema = new Schema(
  {
    event: { type: Types.ObjectId, ref: "Event", required: true },
    name: { type: String, required: true, trim: true },
    leader: { type: Types.ObjectId, ref: "Student", required: true },
    members: [{ type: Types.ObjectId, ref: "Student", required: true }],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = model("Team", TeamSchema);
