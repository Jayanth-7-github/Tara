const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function signToken(userId) {
  const secret = process.env.JWT_SECRET || "dev_secret_change_me";
  return jwt.sign({ id: userId }, secret, { expiresIn: "7d" });
}

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd, // set true behind HTTPS
    sameSite: isProd ? "none" : "lax", // allow cross-site cookies in prod
    maxAge: 7 * ONE_DAY_MS,
    path: "/",
  };
}

exports.signup = async (req, res) => {
  try {
    const { email, password, regno, name, role } = req.body || {};
    if (!email || !password || !regno)
      return res
        .status(400)
        .json({ error: "email, password, and regno are required" });

    const existingEmail = await User.findOne({
      email: String(email).toLowerCase(),
    });
    if (existingEmail)
      return res.status(409).json({ error: "Email already in use" });

    const existingRegno = await User.findOne({
      regno: String(regno).toUpperCase(),
    });
    if (existingRegno)
      return res
        .status(409)
        .json({ error: "Registration number already in use" });

    const hash = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      email: String(email).toLowerCase(),
      password: hash,
      regno: String(regno).toUpperCase(),
      name: name || undefined,
      role: role || undefined,
    });

    const token = signToken(user._id);
    res.cookie("token", token, cookieOptions());
    return res.status(201).json({ user: user.toSafeJSON() });
  } catch (err) {
    console.error("signup error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res
        .status(400)
        .json({ error: "email/regno and password required" });

    // Try to find user by email or regno
    const identifier = String(email).trim();
    let user = null;

    // Check if it looks like an email
    if (identifier.includes("@")) {
      user = await User.findOne({ email: identifier.toLowerCase() });
    } else {
      // Otherwise, treat as regno
      user = await User.findOne({ regno: identifier.toUpperCase() });
    }

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(String(password), user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken(user._id);
    res.cookie("token", token, cookieOptions());
    return res.json({ user: user.toSafeJSON() });
  } catch (err) {
    console.error("login error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.logout = async (_req, res) => {
  res.cookie("token", "", { ...cookieOptions(), maxAge: 0 });
  return res.json({ message: "Logged out" });
};

exports.getMe = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ user: user.toSafeJSON() });
  } catch (err) {
    console.error("getMe error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.checkLogin = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ authenticated: false });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ authenticated: false });
    return res.json({ authenticated: true, user: user.toSafeJSON() });
  } catch (err) {
    console.error("checkLogin error", err);
    return res.status(401).json({ authenticated: false });
  }
};
