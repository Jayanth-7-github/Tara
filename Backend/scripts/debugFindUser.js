require("dotenv").config();
const { connectDB, disconnectDB } = require("../db");
const User = require("../models/User");

(async function main() {
  try {
    await connectDB(process.env.MONGO_URL);

    const email = process.argv[2];
    const regno = process.argv[3];

    if (!email && !regno) {
      console.log("Usage: node scripts/debugFindUser.js <email> <regno>");
      console.log(
        "Example: node scripts/debugFindUser.js 99240041378@klu.ac.in 99240041378",
      );
      process.exit(0);
    }

    const or = [];
    if (email) {
      or.push({ email: String(email).toLowerCase() });
      or.push({ email: String(email) });
    }
    if (regno) {
      or.push({ regno: String(regno).toUpperCase() });
      or.push({ regno: String(regno) });
    }

    const users = await User.find({ $or: or }).lean();
    console.log("Matched users:", users.length);
    for (const u of users) {
      console.log({
        id: String(u._id),
        email: u.email,
        regno: u.regno,
        role: u.role,
      });
    }

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error("debugFindUser error:", err);
    try {
      await disconnectDB();
    } catch {}
    process.exit(1);
  }
})();
