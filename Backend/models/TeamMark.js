const { Schema, model, Types } = require("mongoose");

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const TeamMarkCategorySchema = new Schema(
  {
    criteriaType: { type: String, required: true, trim: true },
    criteriaKey: { type: String, required: true, trim: true, index: true },
    score: { type: Number, required: true, min: 0 },
    maxScore: { type: Number, required: true, min: 0 },
  },
  { _id: true },
);

const TeamMarkSchema = new Schema(
  {
    event: { type: Types.ObjectId, ref: "Event", required: true, index: true },
    team: { type: Types.ObjectId, ref: "Team", required: true, index: true },
    roundName: { type: String, required: true, trim: true },
    roundKey: { type: String, required: true, trim: true, index: true },
    categories: { type: [TeamMarkCategorySchema], default: [] },
    notes: { type: String, trim: true, default: "" },
    createdBy: { type: Types.ObjectId, ref: "User" },
    updatedBy: { type: Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

TeamMarkSchema.pre("validate", function setNormalizedKeys(next) {
  this.roundName = String(this.roundName || "").trim();
  this.roundKey = normalizeKey(this.roundName);

  this.categories = (Array.isArray(this.categories) ? this.categories : []).map(
    (category) => {
      const criteriaType = String(category?.criteriaType || "").trim();
      return {
        ...category,
        criteriaType,
        criteriaKey: normalizeKey(criteriaType),
      };
    },
  );

  next();
});

TeamMarkSchema.index(
  { event: 1, team: 1, roundKey: 1 },
  {
    unique: true,
    partialFilterExpression: { categories: { $exists: true } },
  },
);

module.exports = model("TeamMark", TeamMarkSchema);
