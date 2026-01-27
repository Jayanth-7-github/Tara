const { connectDB, disconnectDB } = require("../db");
const User = require("../models/User");
const authController = require("../controllers/authController");

function roleRank(role) {
  switch (String(role || "").toLowerCase()) {
    case "admin":
      return 3;
    case "member":
      return 2;
    case "student":
      return 1;
    default:
      return 0;
  }
}

(async function main() {
  try {
    const mongo = process.env.MONGO_URL || "mongodb://localhost:27017/tara";
    await connectDB(mongo);
    console.log("Reconciling user roles against RoleConfig...");

    const users = await User.find().lean();
    let updated = 0;
    for (const u of users) {
      try {
        const desired = await authController.determineRole({
          email: u.email,
          regno: u.regno,
        });
        const current = u.role || "user";
        // Only upgrade roles; never downgrade admins/members.
        if (roleRank(desired) > roleRank(current)) {
          await User.updateOne({ _id: u._id }, { $set: { role: desired } });
          updated++;
          console.log(
            `Updated ${u._id} (${u.email || u.regno}) ${current} -> ${desired}`,
          );
        }
      } catch (e) {
        console.warn(`Failed to determine role for ${u._id}:`, e.message || e);
      }
    }

    console.log(`Done. Updated ${updated} user(s).`);
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error("Reconcile failed:", err);
    try {
      await disconnectDB();
    } catch (e) {}
    process.exit(1);
  }
})();
