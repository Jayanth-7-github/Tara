const mongoose = require("mongoose");

const TestResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
    eventName: {
      type: String,
    },
    testTitle: {
      type: String,
      default: "Event Assessment",
    },
    answers: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      required: true,
      // Format: { questionId: selectedAnswerIndex (Number) OR { code: String, passed: Number } }
    },
    markedForReview: {
      type: Map,
      of: Boolean,
      default: {},
      // Format: { questionId: true/false }
    },
    score: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    timeSpent: {
      type: Number, // in seconds
      default: 0,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    environment: {
      cameraEnabled: { type: Boolean, default: false },
      screenShareEnabled: { type: Boolean, default: false },
      fullscreenUsed: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// Index for faster queries
TestResultSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("TestResult", TestResultSchema);
