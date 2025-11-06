const path = require("path");
const Student = require(path.join(__dirname, "..", "models", "Student"));

exports.getStudentByRegNo = async (req, res) => {
  const regno = req.params.regno;
  if (!regno)
    return res.status(400).json({ error: "Registration number required" });

  try {
    // case-insensitive exact match for regno
    const student = await Student.findOne({
      regno: new RegExp(`^${regno}$`, "i"),
    }).lean();
    if (!student)
      return res
        .status(404)
        .json({ error: "No student found for this registration number." });
    res.json(student);
  } catch (err) {
    console.error("getStudentByRegNo error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/students
// Create a new student
exports.createStudent = async (req, res) => {
  // If an array is sent to this endpoint, point user to bulk endpoint
  if (Array.isArray(req.body)) {
    return res.status(400).json({
      error:
        "Request body must be a single student object. For bulk creation, POST an array to /api/students/bulk.",
    });
  }
  try {
    const { regno, name, department, year, phone } = req.body || {};

    // Basic validation
    if (!regno || !name) {
      return res
        .status(400)
        .json({ error: "Both 'regno' and 'name' are required." });
    }

    const trimmedRegno = String(regno).trim();
    const trimmedName = String(name).trim();

    if (!trimmedRegno || !trimmedName) {
      return res
        .status(400)
        .json({ error: "'regno' and 'name' cannot be empty." });
    }

    // Enforce case-insensitive uniqueness for regno
    const existing = await Student.findOne({
      regno: new RegExp(`^${trimmedRegno}$`, "i"),
    }).lean();
    if (existing) {
      return res.status(409).json({
        error: "A student with this registration number already exists.",
      });
    }

    const payload = {
      regno: trimmedRegno,
      name: trimmedName,
    };
    if (department != null) payload.department = String(department).trim();
    if (year != null) payload.year = String(year).trim();
    if (phone != null) payload.phone = String(phone).trim();

    const created = await Student.create(payload);
    // Return the created document
    return res.status(201).json(created);
  } catch (err) {
    // Handle duplicate key error just in case unique index catches it
    if (err && err.code === 11000) {
      return res.status(409).json({
        error: "A student with this registration number already exists.",
      });
    }
    console.error("createStudent error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/students/bulk
// Create many students with per-item results
exports.createStudentsBulk = async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({
        error: "Request body must be an array of student objects.",
      });
    }

    const seen = new Set(); // case-insensitive regno seen in this request
    const results = {
      created: [], // { regno, _id }
      duplicates: [], // regno that already exist in DB
      duplicatesInPayload: [], // regno repeated in same payload
      invalid: [], // { index, reason }
      errors: [], // { index, regno, error }
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i] || {};
      const regno = item.regno != null ? String(item.regno).trim() : "";
      const name = item.name != null ? String(item.name).trim() : "";
      const department =
        item.department != null ? String(item.department).trim() : undefined;
      const year = item.year != null ? String(item.year).trim() : undefined;
      const phone = item.phone != null ? String(item.phone).trim() : undefined;

      if (!regno || !name) {
        results.invalid.push({
          index: i,
          reason: "Both 'regno' and 'name' are required.",
        });
        continue;
      }

      const key = regno.toLowerCase();
      if (seen.has(key)) {
        results.duplicatesInPayload.push(regno);
        continue;
      }
      seen.add(key);

      try {
        const existing = await Student.findOne({
          regno: new RegExp(`^${regno}$`, "i"),
        }).lean();
        if (existing) {
          results.duplicates.push(regno);
          continue;
        }

        const created = await Student.create({
          regno,
          name,
          department,
          year,
          phone,
        });
        results.created.push({ regno: created.regno, _id: created._id });
      } catch (err) {
        if (err && err.code === 11000) {
          results.duplicates.push(regno);
        } else {
          results.errors.push({ index: i, regno, error: "Failed to create" });
          console.error("createStudentsBulk item error:", err);
        }
      }
    }

    return res.status(200).json({
      count: {
        total: items.length,
        created: results.created.length,
        duplicates: results.duplicates.length,
        duplicatesInPayload: results.duplicatesInPayload.length,
        invalid: results.invalid.length,
        errors: results.errors.length,
      },
      ...results,
    });
  } catch (err) {
    console.error("createStudentsBulk error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
