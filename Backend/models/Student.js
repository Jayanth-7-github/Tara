const { Schema, model } = require("mongoose");

const StudentSchema = new Schema(
  {
    regno: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    department: { type: String },
    college: { type: String },
    year: { type: String },
    phone: { type: String },
    email: { type: String, unique: true },
    eventName: { type: String, trim: true },
    // keep track of event registrations on the student document
    registrations: [
      {
        event: {
          type: require("mongoose").Schema.Types.ObjectId,
          ref: "Event",
        },
        // store the event title for convenience (denormalized)
        eventName: { type: String, trim: true },
        registeredAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = model("Student", StudentSchema);
