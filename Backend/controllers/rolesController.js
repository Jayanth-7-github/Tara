const RoleConfig = require("../models/RoleConfig");

// Return current roles mapping (admins/students)
exports.getRoles = async (_req, res) => {
  try {
    const doc = await RoleConfig.findOne().lean();
    if (!doc) return res.json({ admins: [], students: [] });
    return res.json({ admins: doc.admins || [], students: doc.students || [] });
  } catch (err) {
    console.error("getRoles error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Upsert roles mapping. Expect body: { admins: [..], students: [..] }
// This endpoint should be protected by admin middleware (done in routes).
exports.upsertRoles = async (req, res) => {
  try {
    const { admins, students } = req.body || {};

    // Helper to normalize an input that may be an array, a single string,
    // or a comma/space separated list. We treat all identifiers as regnos
    // (uppercase) because "only regno is enough" per user request.
    const normalizeToRegnos = (input) => {
      if (!input && input !== 0) return [];
      // If array, flatten and convert
      if (Array.isArray(input)) {
        return input.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
      }
      // If a single string, split on commas or whitespace
      const str = String(input);
      // allow comma-separated or space-separated values
      const parts = str.includes(",") ? str.split(",") : str.split(/\s+/);
      return parts.map((p) => String(p).trim().toUpperCase()).filter(Boolean);
    };

    const adminsArr = normalizeToRegnos(admins);
    const studentsArr = normalizeToRegnos(students);

    let doc = await RoleConfig.findOne();
    if (!doc) {
      // If no document exists, create one with the provided arrays (may be empty)
      doc = await RoleConfig.create({
        admins: adminsArr,
        students: studentsArr,
      });
    } else {
      // Merge behavior: only add new entries if provided; do not replace with empty arrays
      if (adminsArr && adminsArr.length > 0) {
        const existing = Array.isArray(doc.admins) ? doc.admins : [];
        const merged = Array.from(new Set(existing.concat(adminsArr)));
        doc.admins = merged;
      }
      if (studentsArr && studentsArr.length > 0) {
        const existing = Array.isArray(doc.students) ? doc.students : [];
        const merged = Array.from(new Set(existing.concat(studentsArr)));
        doc.students = merged;
      }
      await doc.save();
    }

    return res.json({ admins: doc.admins, students: doc.students });
  } catch (err) {
    console.error("upsertRoles error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
