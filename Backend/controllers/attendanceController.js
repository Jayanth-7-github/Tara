const path = require("path");
const fs = require("fs");

const ATT_FILE = path.join(__dirname, "..", "data", "attendance.json");
const STUDENTS_FILE = path.join(__dirname, "..", "data", "students.json");

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) || [];
  } catch (err) {
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

exports.markAttendance = (req, res) => {
  const { regno, eventName } = req.body || {};
  if (!regno) return res.status(400).json({ error: "regno is required" });

  const students = readJSON(STUDENTS_FILE);
  const student = students.find(
    (s) => String(s.regno).toLowerCase() === String(regno).toLowerCase()
  );
  if (!student)
    return res
      .status(404)
      .json({ error: "No student found for this registration number." });

  const attendance = readJSON(ATT_FILE);
  const timestamp = Date.now();

  // Prevent double-marking for same event
  const event = eventName || "default";
  const already = attendance.find(
    (a) => a.regno === student.regno && a.eventName === event
  );
  if (already) {
    return res.json({
      message: `Attendance already marked for ${student.name}`,
      attendance: already,
    });
  }

  const record = {
    regno: student.regno,
    name: student.name,
    eventName: event,
    timestamp,
    isPresent: true,
  };
  attendance.push(record);
  writeJSON(ATT_FILE, attendance);

  res.json({
    message: `Attendance marked successfully for ${student.name}.`,
    attendance: record,
  });
};

exports.getSummary = (req, res) => {
  const attendance = readJSON(ATT_FILE);
  const total = attendance.length;
  // group by event
  const byEvent = {};
  attendance.forEach((a) => {
    byEvent[a.eventName] = byEvent[a.eventName] || 0;
    byEvent[a.eventName]++;
  });
  res.json({
    total,
    byEvent,
    records: attendance.slice().reverse().slice(0, 50),
  });
};
