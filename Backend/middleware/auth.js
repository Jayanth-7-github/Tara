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
