const path = require("path");
const Student = require(path.join(__dirname, "..", "models", "Student"));

function normalizeStudentInput(input) {
  const body = input || {};

  const regnoRaw =
    body.regno ?? body.rollNumber ?? body.rollno ?? body["Roll Number"];
  const nameRaw = body.name ?? body["Name"];

  const teamNameRaw = body.teamName ?? body["Team Name"];
  const roleRaw = body.role ?? body["Role"];
  const emailRaw = body.email ?? body["Email"];
  const branchRaw = body.branch ?? body["Branch"] ?? body.department;
  const hostelNameRaw = body.hostelName ?? body["Hostel Name"];
  const roomNoRaw = body.roomNo ?? body["Room No"];

  const departmentRaw = body.department; // legacy
  const yearRaw = body.year;
  const phoneRaw = body.phone;

  const regno = regnoRaw != null ? String(regnoRaw).trim() : "";
  const name = nameRaw != null ? String(nameRaw).trim() : "";

  const payload = { regno, name };

  if (teamNameRaw != null) payload.teamName = String(teamNameRaw).trim();
  if (roleRaw != null) payload.role = String(roleRaw).trim();
  if (emailRaw != null) payload.email = String(emailRaw).trim();
  if (branchRaw != null) payload.branch = String(branchRaw).trim();
  if (hostelNameRaw != null) payload.hostelName = String(hostelNameRaw).trim();
  if (roomNoRaw != null) payload.roomNo = String(roomNoRaw).trim();

  // legacy fields (keep if caller still uses them)
  if (departmentRaw != null) payload.department = String(departmentRaw).trim();
  if (yearRaw != null) payload.year = String(yearRaw).trim();
  if (phoneRaw != null) payload.phone = String(phoneRaw).trim();

  return payload;
}

// GET /api/students/search?q=99
// Search students by regno prefix
exports.searchStudents = async (req, res) => {
  const query = req.query.q || "";
  if (!query.trim()) {
    return res.json([]);
  }

  try {
    // Find students whose regno starts with the query (case-insensitive)
    const students = await Student.find({
      regno: new RegExp(`^${query}`, "i"),
    })
      .select("regno name branch department year role teamName")
      .limit(20)
      .lean();
    res.json(students);
  } catch (err) {
    console.error("searchStudents error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

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
    const normalized = normalizeStudentInput(req.body);
    const { regno, name } = normalized;

    // Basic validation
    if (!regno || !name) {
      return res.status(400).json({
        error:
          "Both 'regno' (or 'Roll Number') and 'name' (or 'Name') are required.",
      });
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
      ...normalized,
      regno: trimmedRegno,
      name: trimmedName,
    };

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
      const normalized = normalizeStudentInput(item);
      const regno = normalized.regno;
      const name = normalized.name;

      if (!regno || !name) {
        results.invalid.push({
          index: i,
          reason:
            "Both 'regno' (or 'Roll Number') and 'name' (or 'Name') are required.",
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

        const created = await Student.create(normalized);
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
