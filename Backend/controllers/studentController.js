const path = require("path");
const Student = require(path.join(__dirname, "..", "models", "Student"));
const Team = require(path.join(__dirname, "..", "models", "Team"));
const Event = require(path.join(__dirname, "..", "models", "Event"));
const User = require(path.join(__dirname, "..", "models", "User"));
const DeletedRegistration = require(
  path.join(__dirname, "..", "models", "DeletedRegistration"),
);

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
  const eventId = req.query.eventId;

  if (!query.trim()) {
    return res.json([]);
  }

  try {
    const filter = {
      regno: new RegExp(`^${query}`, "i"),
    };

    if (eventId) {
      // Filter by registration for this event
      filter["registrations.event"] = eventId;
    }

    // Find students whose regno starts with the query (case-insensitive)
    const students = await Student.find(filter)
      .select("regno name branch department year role teamName registrations") // Added registrations to return for debug/client use
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

    // Optional: if eventId is provided and the event is a team event,
    // derive team name from Team collection for accurate per-event display.
    const eventId =
      req.query && req.query.eventId ? String(req.query.eventId).trim() : "";
    if (eventId) {
      try {
        const ev = await Event.findById(eventId)
          .select("participationType")
          .lean();
        if (ev && ev.participationType === "team") {
          const team = await Team.findOne({
            event: eventId,
            $or: [{ leader: student._id }, { members: student._id }],
          })
            .select("name")
            .lean();
          if (team && team.name) {
            student.teamName = team.name;
          }
        }
      } catch (e) {
        // Do not fail the request if team lookup fails
      }
    }

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
    return res.status(500).json({ error: "Internal server error" });
  }
};

// PUT /api/students/:regno
exports.updateStudent = async (req, res) => {
  const regnoParam = req.params.regno;
  if (!regnoParam) {
    return res.status(400).json({ error: "regno is required" });
  }

  try {
    const existing = await Student.findOne({
      regno: new RegExp(`^${regnoParam}$`, "i"),
    });

    if (!existing) {
      return res.status(404).json({ error: "Student not found" });
    }

    const body = req.body || {};
    // fields to update
    if (body.name) existing.name = body.name.trim();
    if (body.email !== undefined)
      existing.email = body.email ? body.email.trim() : null;
    if (body.phone !== undefined)
      existing.phone = body.phone ? body.phone.trim() : null;
    if (body.year !== undefined)
      existing.year = body.year ? body.year.trim() : null;
    if (body.department !== undefined)
      existing.department = body.department ? body.department.trim() : null;
    if (body.branch !== undefined)
      existing.branch = body.branch ? body.branch.trim() : null;
    if (body.teamName !== undefined)
      existing.teamName = body.teamName ? body.teamName.trim() : null;
    if (body.role !== undefined)
      existing.role = body.role ? body.role.trim() : null;
    if (body.hostelName !== undefined)
      existing.hostelName = body.hostelName ? body.hostelName.trim() : null;
    if (body.roomNo !== undefined)
      existing.roomNo = body.roomNo ? body.roomNo.trim() : null;

    const saved = await existing.save();
    return res.json(saved);
  } catch (err) {
    console.error("updateStudent error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Soft delete a registration
exports.softDeleteRegistration = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { studentId, eventId } = req.body;
    if (!studentId || !eventId) {
      return res.status(400).json({ error: "studentId and eventId required" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const regIndex = student.registrations.findIndex(
      (r) => r.event.toString() === eventId && !r.isDeleted,
    );
    if (regIndex === -1) {
      return res.status(404).json({ error: "Active registration not found" });
    }

    const registration = student.registrations[regIndex];

    // Move registration data to DeletedRegistration collection
    await DeletedRegistration.create({
      studentId: student._id,
      regno: student.regno,
      name: student.name,
      email: student.email,
      department: student.department,
      college: student.college,
      year: student.year,
      phone: student.phone,
      branch: student.branch,
      hostelName: student.hostelName,
      roomNo: student.roomNo,
      eventId: registration.event,
      eventTitle: registration.eventName,
      registeredAt: registration.registeredAt,
      paymentReference: registration.paymentReference,
      paymentScreenshotUrl: registration.paymentScreenshotUrl,
      paymentScreenshotPublicId: registration.paymentScreenshotPublicId,
      paymentAmount: registration.paymentAmount,
      paymentStatus: registration.paymentStatus,
      paymentSubmittedAt: registration.paymentSubmittedAt,
      deletedBy: req.user.id,
    });

    // Remove from student's registrations array
    student.registrations.splice(regIndex, 1);
    await student.save();

    res.json({ message: "Registration soft deleted" });
  } catch (err) {
    console.error("softDeleteRegistration error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Undo soft delete
exports.undoDeleteRegistration = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { studentId, eventId } = req.body;
    if (!studentId || !eventId) {
      return res.status(400).json({ error: "studentId and eventId required" });
    }

    // Find the deleted registration
    const deletedReg = await DeletedRegistration.findOne({
      studentId,
      eventId,
    });
    if (!deletedReg) {
      return res.status(404).json({ error: "Deleted registration not found" });
    }

    // Find or create the student
    let student = await Student.findById(studentId);
    if (!student) {
      // Recreate student if they were deleted
      student = await Student.create({
        _id: studentId,
        regno: deletedReg.regno,
        name: deletedReg.name,
        email: deletedReg.email,
        department: deletedReg.department,
        college: deletedReg.college,
        year: deletedReg.year,
        phone: deletedReg.phone,
        branch: deletedReg.branch,
        hostelName: deletedReg.hostelName,
        roomNo: deletedReg.roomNo,
      });
    }

    // Add registration back to student
    student.registrations.push({
      event: deletedReg.eventId,
      eventName: deletedReg.eventTitle,
      registeredAt: deletedReg.registeredAt,
      paymentReference: deletedReg.paymentReference,
      paymentScreenshotUrl: deletedReg.paymentScreenshotUrl,
      paymentScreenshotPublicId: deletedReg.paymentScreenshotPublicId,
      paymentAmount: deletedReg.paymentAmount,
      paymentStatus: deletedReg.paymentStatus,
      paymentSubmittedAt: deletedReg.paymentSubmittedAt,
    });

    await student.save();

    // Remove from deleted registrations
    await DeletedRegistration.findByIdAndDelete(deletedReg._id);

    res.json({ message: "Registration restored" });
  } catch (err) {
    console.error("undoDeleteRegistration error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Permanent delete a registration
exports.permanentDeleteRegistration = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { studentId, eventId } = req.body;
    if (!studentId || !eventId) {
      return res.status(400).json({ error: "studentId and eventId required" });
    }

    // Remove from deleted registrations
    const deletedReg = await DeletedRegistration.findOneAndDelete({
      studentId,
      eventId,
    });

    if (!deletedReg) {
      return res.status(404).json({ error: "Deleted registration not found" });
    }

    res.json({ message: "Registration permanently deleted" });
  } catch (err) {
    console.error("permanentDeleteRegistration error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get deleted registrations for events managed by the user
exports.getDeletedRegistrations = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const actor = await User.findById(req.user.id).lean();
    const userEmail =
      actor && actor.email ? String(actor.email).toLowerCase().trim() : null;
    if (!userEmail) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get events managed by this user
    const managedEvents = await Event.find({ managerEmail: userEmail });
    const eventIds = managedEvents.map((e) => e._id.toString());

    // Get deleted registrations for these events
    const deletedRegs = await DeletedRegistration.find({
      eventId: { $in: eventIds },
    }).sort({ deletedAt: -1 });

    const formattedRegs = deletedRegs.map((reg) => ({
      studentId: reg.studentId,
      eventId: reg.eventId,
      eventTitle: reg.eventTitle,
      name: reg.name,
      regno: reg.regno,
      email: reg.email,
      department: reg.department,
      year: reg.year,
      college: reg.college,
      deletedAt: reg.deletedAt,
    }));

    res.json({ deletedRegistrations: formattedRegs });
  } catch (err) {
    console.error("getDeletedRegistrations error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
