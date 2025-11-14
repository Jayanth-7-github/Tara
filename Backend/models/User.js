const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    regno: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    name: { type: String },
    // include 'member' as a valid role so users listed in RoleConfig.members
    // can be stored as 'member' on the User document.
    role: {
      type: String,
      enum: ["admin", "student", "member", "user"],
      default: "user",
    },
  },
  { timestamps: true }
);

// toJSON transformation to hide password
UserSchema.methods.toSafeJSON = function () {
  const obj = this.toObject({ versionKey: false });
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", UserSchema);
