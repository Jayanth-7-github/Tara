const mongoose = require("mongoose");

const RoleConfigSchema = new mongoose.Schema(
  {
    admins: { type: [String], default: [] },
    students: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RoleConfig", RoleConfigSchema);
