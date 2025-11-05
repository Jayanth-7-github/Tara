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
