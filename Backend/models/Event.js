const { Schema, model } = require("mongoose");

const EventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    venue: { type: String, trim: true },
    date: { type: Date, required: true },
    imageUrl: { type: String, trim: true },
    // Store image binary directly in MongoDB (optional). Use either imageUrl or image.
    image: {
      data: Buffer,
      contentType: String,
    },
    // Counters (normalized registration stored on Student.registrations)
    registeredCount: { type: Number, default: 0 },
    attendedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = model("Event", EventSchema);
