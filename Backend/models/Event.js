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

const EventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    venue: { type: String, trim: true },
    date: { type: Date, required: true },
    imageUrl: { type: String, trim: true },
    // Email of the event manager/organizer. Required so each event has a contact.
    managerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },
    // Store image binary directly in MongoDB (optional). Use either imageUrl or image.
    image: {
      data: Buffer,
      contentType: String,
    },
    // Counters (normalized registration stored on Student.registrations)
    registeredCount: { type: Number, default: 0 },
    attendedCount: { type: Number, default: 0 },
    isTestEnabled: { type: Boolean, default: false },
    questions: [QuestionSchema],
  },
  { timestamps: true }
);

module.exports = model("Event", EventSchema);
