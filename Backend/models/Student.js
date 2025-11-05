const { Schema, model } = require("mongoose");

const StudentSchema = new Schema(
  {
    regno: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    department: { type: String },
    year: { type: String },
    phone: { type: String },
  },
  { timestamps: true }
);

module.exports = model("Student", StudentSchema);
