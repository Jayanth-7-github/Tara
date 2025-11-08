const RoleConfig = require("../models/RoleConfig");

// GET /api/roles  - public read
exports.getRoles = async (req, res) => {
  try {
    const doc = await RoleConfig.findOne().lean();
    if (!doc) return res.json({ admins: [], students: [] });
    return res.json({ admins: doc.admins || [], students: doc.students || [] });
  } catch (err) {
    console.error("getRoles error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/roles - upsert roles (admin-only)
exports.upsertRoles = async (req, res) => {
  try {
    // Simple password check: the password is hardcoded here per request.
    // The body must include { password: "99240041378" } to authorize.
    const provided = (req.body && req.body.password) || "";
    const secret = "99240041378";
    if (!provided || provided !== secret) {
      return res.status(401).json({ error: "Unauthorized: invalid password" });
    }

    // Accept either plural arrays or singular keys. Coerce strings to arrays for convenience.
    const body = req.body || {};
    const adminsRaw = body.admins ?? body.admin ?? [];
    const studentsRaw = body.students ?? body.student ?? [];

    const toArray = (v) => {
      if (!v) return [];
      if (Array.isArray(v))
        return v.map((s) => String(s).trim()).filter(Boolean);
      return [String(v).trim()];
    };

    const update = {
      admins: toArray(adminsRaw),
      students: toArray(studentsRaw),
    };

    const doc = await RoleConfig.findOneAndUpdate({}, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    return res.json({
      roles: { admins: doc.admins || [], students: doc.students || [] },
    });
  } catch (err) {
    console.error("upsertRoles error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
