const mongoose = require("mongoose");

const EventRoleSchema = new mongoose.Schema(
  {
    admins: { type: [String], default: [] },
    students: { type: [String], default: [] },
    // store a human-friendly event title alongside the per-event lists
    title: { type: String },
  },
  { _id: false }
);

const RoleConfigSchema = new mongoose.Schema(
  {
    // global lists (legacy / site-wide)
    admins: { type: [String], default: [] },
    students: { type: [String], default: [] },
    // members: new global role - e.g., site members who are not admins
    members: { type: [String], default: [] },
    // per-event students map keyed by event title/name
    // Example shape: studentsByEvent: { "Vintra": ["99240041379", ...] }
    studentsByEvent: { type: Map, of: [String], default: {} },
    // per-event event managers mapping keyed by event title/name (emails)
    eventManagersByEvent: { type: Map, of: [String], default: {} },
    // legacy per-event roles removed in favor of per-event maps above
    // eventRoles: { type: Map, of: EventRoleSchema, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RoleConfig", RoleConfigSchema);
