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
    if (user.role !== "admin")
      return res.status(403).json({ error: "Forbidden" });
    // attach role for downstream handlers
    req.user.role = user.role;
    return next();
  } catch (err) {
    console.error("requireAdmin error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
