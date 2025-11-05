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

// Export attendance as CSV (server-side)
exports.exportCSV = async (req, res) => {
  try {
    const attendance = await Attendance.find({}).sort({ createdAt: -1 }).lean();

    const keys = ["regno", "name", "eventName", "timestamp", "isPresent"];
    const lines = [keys.join(",")];

    for (const row of attendance) {
      const vals = keys.map((k) => {
        let v = row[k];
        if (k === "timestamp") v = row[k] ? new Date(row[k]).toISOString() : "";
        let s = v == null ? "" : String(v);
        s = s.replace(/"/g, '""');
        if (s.search(/,|\n|"/) >= 0) return `"${s}"`;
        return s;
      });
      lines.push(vals.join(","));
    }

    const csv = lines.join("\n");

    // Add BOM for Excel compatibility
    const bom = "\uFEFF";
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="attendance_export.csv"'
    );
    res.send(bom + csv);
  } catch (err) {
    console.error("exportCSV error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
