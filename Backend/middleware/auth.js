const jwt = require("jsonwebtoken");

exports.protect = (req, res, next) => {
  try {
    let token = null;
    // Prefer cookie
    if (req.cookies && req.cookies.token) token = req.cookies.token;
    // Fallback to Authorization header
    if (
      !token &&
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const secret = process.env.JWT_SECRET || "dev_secret_change_me";
    const decoded = jwt.verify(token, secret);
    req.user = { id: decoded.id };
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// Require admin: must be used after `protect` so `req.user.id` is available.
exports.requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id)
      return res.status(401).json({ error: "Unauthorized" });
    // lazy-load User model to avoid circular requires
    const User = require("../models/User");
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    // If stored role is admin, allow. Otherwise consult the roles mapping (DB/file)
    if (user.role === "admin") {
      req.user.role = user.role;
      return next();
    }

    // consult determineRole (may read RoleConfig from DB or fallback file)
    try {
      const { determineRole } = require("../controllers/authController");
      const computed = await determineRole({
        email: user.email,
        regno: user.regno,
      });
      if (computed === "admin") {
        // allow admin via roles mapping even if user.role not set in DB
        req.user.role = "admin";
        // optionally persist the role to the user document so subsequent checks are faster
        try {
          const UserModel = require("../models/User");
          await UserModel.findByIdAndUpdate(user._id, { role: "admin" }).catch(
            () => {}
          );
        } catch (e) {
          // ignore persistence errors
        }
        return next();
      }
    } catch (e) {
      console.error("requireAdmin determineRole error", e);
    }

    return res.status(403).json({ error: "Forbidden" });
  } catch (err) {
    console.error("requireAdmin error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
