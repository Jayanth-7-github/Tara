const mongoose = require("mongoose");

const RoleConfigSchema = new mongoose.Schema(
  {
    admins: [{ type: String }],
    students: [{ type: String }],
  },
  { timestamps: true }
);

// Keep the collection name fixed
module.exports = mongoose.model("RoleConfig", RoleConfigSchema);
