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
    attendees: [
      {
        name: { type: String, trim: true },
        email: { type: String, trim: true },
        regno: { type: String, trim: true },
        registeredAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = model("Event", EventSchema);
