const { Schema, model } = require("mongoose");

const QuestionSchema = new Schema({
  id: { type: String }, // Use string ID to be flexible, or rely on _id
  type: { type: String, enum: ["mcq", "coding"], default: "mcq" },
  text: { type: String, required: true },
  options: [String],
  correctAnswer: { type: Schema.Types.Mixed }, // Number index for MCQ
  marks: { type: Number, default: 1 },
  // Coding specific
  initialCode: String,
  testCases: [
    {
      input: String,
      expected: String,
    },
  ],
  example: {
    input: String,
    output: String,
  },
  language: { type: String, default: "c++" },
});

const TeamMarkCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    maxScore: { type: Number, default: 10, min: 0 },
  },
  { _id: false },
);

const TeamMarkRoundSchema = new Schema(
  {
    roundName: { type: String, required: true, trim: true },
    categories: { type: [TeamMarkCategorySchema], default: [] },
  },
  { _id: false },
);

const EventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    venue: { type: String, trim: true },
    date: { type: Date, required: true },
    // Optional price in rupees. 0 or missing means free.
    price: { type: Number, default: 0, min: 0 },
    imageUrl: { type: String, trim: true },
    cloudinaryPublicId: { type: String, trim: true },
    // Email of the event manager/organizer. Required so each event has a contact.
    managerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },
    // Team configuration
    participationType: {
      type: String,
      enum: ["solo", "team"],
      default: "solo",
    },
    minTeamSize: { type: Number, default: 1, min: 1 },
    maxTeamSize: {
      type: Number,
      default: 1,
      min: 1,
      validate: {
        validator: function (v) {
          // During update, this.minTeamSize may not be set, so fallback to parent doc or query
          if (typeof this.minTeamSize === "number") {
            return v >= this.minTeamSize;
          }
          if (this.getUpdate) {
            // Called on query, get minTeamSize from update object
            const update = this.getUpdate();
            const min =
              update.minTeamSize || (update.$set && update.$set.minTeamSize);
            if (typeof min === "number") return v >= min;
          }
          return true; // fallback: allow
        },
        message: "maxTeamSize must be greater than or equal to minTeamSize",
      },
    },
    // Legacy fallback for older events created before Cloudinary-backed storage.
    image: {
      data: Buffer,
      contentType: String,
    },
    // Counters (normalized registration stored on Student.registrations)
    registeredCount: { type: Number, default: 0 },
    attendedCount: { type: Number, default: 0 },
    isTestEnabled: { type: Boolean, default: false },
    // Per-test enable flags: allow manager to enable/disable Test 1 (MCQ) and Test 2 (Coding)
    isMcqEnabled: { type: Boolean, default: false },
    isCodingEnabled: { type: Boolean, default: false },
    // Optional per-event exam security code used to gate online tests
    examSecurityCode: { type: String, trim: true },
    questions: [QuestionSchema],
    sessions: [
      {
        name: { type: String, required: true },
        isActive: { type: Boolean, default: false },
      },
    ],
    // Separate sessions used by Student Attendance (photo + approval)
    studentSessions: [
      {
        name: { type: String, required: true },
        isActive: { type: Boolean, default: false },
      },
    ],
    teamMarksConfig: {
      type: [TeamMarkRoundSchema],
      default: [],
    },
    accessKey: { type: String, trim: true, index: true },
  },
  { timestamps: true },
);

module.exports = model("Event", EventSchema);
