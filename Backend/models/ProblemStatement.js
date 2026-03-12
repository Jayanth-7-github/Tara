const { Schema, model } = require("mongoose");

const ProblemStatementSchema = new Schema(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

ProblemStatementSchema.index({ event: 1, order: 1, updatedAt: -1 });
ProblemStatementSchema.index({ event: 1, isActive: 1 });

module.exports = model("ProblemStatement", ProblemStatementSchema);
