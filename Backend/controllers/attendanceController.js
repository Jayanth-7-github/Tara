const path = require("path");
const Student = require(path.join(__dirname, "..", "models", "Student"));
const Attendance = require(path.join(__dirname, "..", "models", "Attendance"));

exports.markAttendance = async (req, res) => {
  const { regno, eventName } = req.body || {};
  if (!regno) return res.status(400).json({ error: "regno is required" });

  try {
    // find student in DB (case-insensitive regno)
    const student = await Student.findOne({
      regno: new RegExp(`^${regno}$`, "i"),
    }).lean();
    if (!student)
      return res
        .status(404)
        .json({ error: "No student found for this registration number." });

    const event = eventName || "default";

    // Prevent double-marking for same event
    const already = await Attendance.findOne({
      regno: student.regno,
      eventName: event,
    }).lean();
    if (already) {
      return res.json({
        message: `Attendance already marked for ${student.name}`,
        attendance: already,
      });
    }

    const record = await Attendance.create({
      regno: student.regno,
      name: student.name,
      eventName: event,
      timestamp: new Date(),
      isPresent: true,
      student: student._id,
    });

    // normalize response shape similar to previous implementation (timestamp as ms)
    const responseRecord = {
      regno: record.regno,
      name: record.name,
      eventName: record.eventName,
      timestamp:
        record.timestamp instanceof Date
          ? record.timestamp.getTime()
          : record.timestamp,
      isPresent: record.isPresent,
      _id: record._id,
    };

    res.json({
      message: `Attendance marked successfully for ${student.name}.`,
      attendance: responseRecord,
    });
  } catch (err) {
    console.error("markAttendance error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const attendance = await Attendance.find({}).sort({ createdAt: -1 }).lean();
    const total = attendance.length;
    const byEvent = {};
    attendance.forEach((a) => {
      const e = a.eventName || "default";
      byEvent[e] = byEvent[e] || 0;
      byEvent[e]++;
    });

    // recent 50 records (reverse of previous implementation)
    const records = attendance.slice(0, 50).map((r) => ({
      regno: r.regno,
      name: r.name,
      eventName: r.eventName,
      timestamp:
        r.timestamp instanceof Date ? r.timestamp.getTime() : r.timestamp,
      isPresent: r.isPresent,
      _id: r._id,
    }));

    res.json({ total, byEvent, records });
  } catch (err) {
    console.error("getSummary error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
