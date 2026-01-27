require("dotenv").config();
const { connectDB, disconnectDB } = require("../db");
const User = require("../models/User");

(async function main() {
  const identifier = process.argv[2];
  const role = process.argv[3];

  if (!identifier || !role) {
    console.log("Usage: node scripts/setUserRole.js <emailOrRegno> <role>");
    console.log(
      "Example: node scripts/setUserRole.js 99240041378@klu.ac.in admin",
    );
    process.exit(1);
  }

  try {
    await connectDB(process.env.MONGO_URL);

    const q = identifier.includes("@")
      ? { email: String(identifier).toLowerCase() }
      : { regno: String(identifier).toUpperCase() };

    const user = await User.findOne(q);
    if (!user) {
      console.error("User not found for", q);
      process.exit(1);
    }

    user.role = String(role).toLowerCase();
    await user.save();

    console.log("Updated role:", {
      id: String(user._id),
      email: user.email,
      regno: user.regno,
      role: user.role,
    });

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error("setUserRole error:", err);
    try {
      await disconnectDB();
    } catch {}
    process.exit(1);
  }
})();
