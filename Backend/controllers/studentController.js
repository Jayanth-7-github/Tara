const path = require("path");
const fs = require("fs");

const STUDENTS_FILE = path.join(__dirname, "..", "data", "students.json");

function readStudents() {
  try {
    const raw = fs.readFileSync(STUDENTS_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

exports.getStudentByRegNo = (req, res) => {
  const regno = req.params.regno;
  if (!regno)
    return res.status(400).json({ error: "Registration number required" });
  const students = readStudents();
  const student = students.find(
    (s) => String(s.regno).toLowerCase() === String(regno).toLowerCase()
  );
  if (!student)
    return res
      .status(404)
      .json({ error: "No student found for this registration number." });
  res.json(student);
};
