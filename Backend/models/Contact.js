const { Schema, model } = require("mongoose");

const ContactSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    eventTitle: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    regno: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    branch: {
      type: String,
      trim: true,
    },
    college: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
    },
    recipientEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["unread", "read", "handled"],
      default: "unread",
      index: true,
    },
    approved: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

// Compound index for efficient queries
ContactSchema.index({ eventId: 1, createdAt: -1 });
ContactSchema.index({ recipientEmail: 1, status: 1 });

module.exports = model("Contact", ContactSchema);
