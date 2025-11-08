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

    // Only overwrite fields that were provided in the request. If a key is omitted,
    // preserve the existing array in the DB.
    const updateFields = {};
    const hasAdminsKey =
      Object.prototype.hasOwnProperty.call(body, "admins") ||
      Object.prototype.hasOwnProperty.call(body, "admin");
    const hasStudentsKey =
      Object.prototype.hasOwnProperty.call(body, "students") ||
      Object.prototype.hasOwnProperty.call(body, "student");

    if (hasAdminsKey) updateFields.admins = toArray(adminsRaw);
    if (hasStudentsKey) updateFields.students = toArray(studentsRaw);

    // If no fields provided, return current roles without modifying.
    if (Object.keys(updateFields).length === 0) {
      const existing = await RoleConfig.findOne().lean();
      return res.json({
        roles: {
          admins: (existing && existing.admins) || [],
          students: (existing && existing.students) || [],
        },
      });
    }

    // Upsert using only provided fields. If the document doesn't exist, create it
    // with provided arrays and default empty arrays for missing fields.
    let doc = await RoleConfig.findOne();
    if (!doc) {
      const toCreate = {
        admins: updateFields.admins || [],
        students: updateFields.students || [],
      };
      doc = await RoleConfig.create(toCreate);
    } else {
      doc = await RoleConfig.findOneAndUpdate(
        {},
        { $set: updateFields },
        { new: true }
      );
    }

    return res.json({
      roles: { admins: doc.admins || [], students: doc.students || [] },
    });
  } catch (err) {
    console.error("upsertRoles error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
