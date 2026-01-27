const { Schema, model } = require("mongoose");

const StudentSchema = new Schema(
  {
    regno: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },

    // Participants list fields (Innovate KARE style)
    teamName: { type: String, trim: true, default: "" },
    role: { type: String, trim: true, default: "Member" },
    branch: { type: String, trim: true },
    hostelName: { type: String, trim: true },
    roomNo: { type: String, trim: true },

    department: { type: String },
    college: { type: String },
    year: { type: String },
    phone: { type: String },

    // Use sparse so multiple docs without email won't collide on the unique index.
    email: { type: String, unique: true, sparse: true, trim: true },
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
  { timestamps: true },
);

// Backward/forward compatible aliases:
// - store as regno/name/role
// - expose as rollNumber/Name/Teamrole for JSON payload compatibility
StudentSchema.virtual("rollNumber")
  .get(function () {
    return this.regno;
  })
  .set(function (v) {
    this.regno = v != null ? String(v).trim() : v;
  });

StudentSchema.virtual("Name")
  .get(function () {
    return this.name;
  })
  .set(function (v) {
    this.name = v != null ? String(v).trim() : v;
  });

StudentSchema.virtual("Teamrole")
  .get(function () {
    return this.role;
  })
  .set(function (v) {
    this.role = v != null ? String(v).trim() : v;
  });

StudentSchema.set("toJSON", { virtuals: true });
StudentSchema.set("toObject", { virtuals: true });

module.exports = model("Student", StudentSchema);
