const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const User = require("../models/User");
const path = require("path");
const RoleConfig = require("../models/RoleConfig");
// roles file: list of admin and student identifiers (emails or regnos)
let rolesConfig = {
  admins: [],
  students: [],
  members: [],
  studentsByEvent: {},
  eventManagersByEvent: {},
};
try {
  rolesConfig = require(path.join(__dirname, "..", "data", "roles.json"));
} catch (e) {
  // file may not exist or be malformed; we'll fall back to empty lists
  console.warn(
    "roles.json not found or invalid — continuing with empty role lists",
  );
}

// Helper: load roles from DB if present, otherwise fallback to `rolesConfig` from file
async function loadRoles() {
  try {
    const doc = await RoleConfig.findOne().lean();
    if (doc) {
      // convert Map-like fields to plain objects if necessary
      const studentsByEvent =
        doc.studentsByEvent instanceof Map
          ? Object.fromEntries(doc.studentsByEvent)
          : doc.studentsByEvent || {};
      const eventManagersByEvent =
        doc.eventManagersByEvent instanceof Map
          ? Object.fromEntries(doc.eventManagersByEvent)
          : doc.eventManagersByEvent || {};
      return {
        admins: doc.admins || [],
        students: doc.students || [],
        members: doc.members || [],
        studentsByEvent,
        eventManagersByEvent,
      };
    }
  } catch (err) {
    console.warn(
      "Failed to read roles from DB, using file fallback:",
      err?.message,
    );
  }
  // fallback to roles.json file contents (may include per-event maps)
  return {
    admins: rolesConfig.admins || [],
    students: rolesConfig.students || [],
    members: rolesConfig.members || [],
    studentsByEvent: rolesConfig.studentsByEvent || {},
    eventManagersByEvent: rolesConfig.eventManagersByEvent || {},
  };
}

async function determineRole({ email, regno }) {
  // normalize
  const e = (email || "").toString().trim().toLowerCase();
  const r = (regno || "").toString().trim().toUpperCase();

  const roles = await loadRoles();
  const admins = Array.isArray(roles?.admins) ? roles.admins : [];
  const students = Array.isArray(roles?.students) ? roles.students : [];
  const members = Array.isArray(roles?.members) ? roles.members : [];

  if (e && admins.includes(e)) return "admin";
  if (r && admins.includes(r)) return "admin";

  if (e && students.includes(e)) return "student";
  if (r && students.includes(r)) return "student";

  // global members list: treat as 'member' (after students/admins checks)
  if (e && members.includes(e)) return "member";
  if (r && members.includes(r)) return "member";

  return "user";
}

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

async function reconcileRoleIfNeeded(user) {
  if (!user) return;
  const desired = await determineRole({ email: user.email, regno: user.regno });

  // Never downgrade a user's existing role based on roles config.
  // This prevents a manually-set admin from being overwritten to "user".
  const current = user.role || "user";
  if (roleRank(desired) > roleRank(current)) {
    user.role = desired;
    await user.save();
  }
}

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
    const { email, password, regno, name } = req.body || {};
    // Require password and at least one identifier (email or regno)
    if (!password || (!email && !regno))
      return res.status(400).json({
        error: "password and at least one of email or regno are required",
      });

    // Check uniqueness only for provided fields
    if (email) {
      const existingEmail = await User.findOne({
        email: String(email).toLowerCase(),
      });
      if (existingEmail)
        return res.status(409).json({ error: "Email already in use" });
    }

    if (regno) {
      const existingRegno = await User.findOne({
        regno: String(regno).toUpperCase(),
      });
      if (existingRegno)
        return res
          .status(409)
          .json({ error: "Registration number already in use" });
    }

    const hash = await bcrypt.hash(String(password), 10);
    const computedRole = await determineRole({ email, regno });
    const toCreate = {
      password: hash,
      name: name || undefined,
      role: computedRole,
    };
    if (email) toCreate.email = String(email).toLowerCase();
    if (regno) toCreate.regno = String(regno).toUpperCase();

    const user = await User.create(toCreate);

    const token = signToken(user._id);
    res.cookie("token", token, cookieOptions());
    let roles = undefined;
    if (user.role === "admin" || user.role === "member") {
      roles = await loadRoles();
    }
    return res.status(201).json({ user: user.toSafeJSON(), roles });
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
    // Keep DB role as source of truth; only upgrade based on roles mapping
    try {
      await reconcileRoleIfNeeded(user);
    } catch (err) {
      console.warn("Failed to reconcile user role from roles config:", err);
    }
    let roles = undefined;
    if (user.role === "admin" || user.role === "member") {
      roles = await loadRoles();
    }
    return res.json({ user: user.toSafeJSON(), roles });
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
    // Only upgrade role based on roles mapping; never downgrade
    try {
      await reconcileRoleIfNeeded(user);
    } catch (err) {
      console.warn("Failed to reconcile user role in getMe:", err);
    }
    let roles = undefined;
    if (user.role === "admin" || user.role === "member") {
      roles = await loadRoles();
    }
    return res.json({ user: user.toSafeJSON(), roles });
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
    // Only upgrade role based on roles mapping; never downgrade
    try {
      await reconcileRoleIfNeeded(user);
    } catch (err) {
      console.warn("Failed to reconcile user role in checkLogin:", err);
    }

    let roles = undefined;
    if (user.role === "admin" || user.role === "member") {
      roles = await loadRoles();
    }
    return res.json({ authenticated: true, user: user.toSafeJSON(), roles });
  } catch (err) {
    console.error("checkLogin error", err);
    return res.status(401).json({ authenticated: false });
  }
};

exports.googleAuthCallback = async (req, res) => {
  try {
    let user = req.user;

    if (!user) {
      return res.status(401).send("Google authentication failed");
    }

    if (typeof user.toSafeJSON !== "function") {
      const id = user.id || user._id;
      if (id) {
        user = await User.findById(id);
      }
    }

    if (!user) {
      return res.status(401).send("Google authentication failed");
    }

    try {
      await reconcileRoleIfNeeded(user);
    } catch (err) {
      console.warn("Failed to reconcile user role in googleAuthCallback:", err);
    }

    const safeUser =
      typeof user.toSafeJSON === "function"
        ? user.toSafeJSON()
        : {
            id: user._id || user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };

    const token = signToken(user._id);
    res.cookie("token", token, cookieOptions());

    const configuredBase = (
      process.env.FRONTEND_URL ||
      process.env.FRONTEND_URL_DEV ||
      ""
    ).trim();

    if (configuredBase) {
      const redirectBase = configuredBase.replace(/\/$/, "");
      const redirectUrl = `${redirectBase}/main?token=${encodeURIComponent(
        token,
      )}&name=${encodeURIComponent(safeUser.name || "")}`;
      return res.redirect(redirectUrl);
    }

    // Fallback: if FRONTEND_URL isn't configured, just send JSON
    // so a client hitting this endpoint directly can still get the token.
    return res.json({ token, user: safeUser });
  } catch (err) {
    console.error("googleAuthCallback error", err);
    return res.status(500).send("Google authentication failed");
  }
};

exports.startGoogleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
});

exports.handleGoogleCallback = (req, res, next) => {
  passport.authenticate("google", { session: false }, (err, user, info) => {
    if (err || !user) {
      console.error("Google OAuth failed:", err || info);
      return res.status(401).send("Google authentication failed");
    }

    req.user = user;
    return exports.googleAuthCallback(req, res, next);
  })(req, res, next);
};

// Expose determineRole for other modules (middleware) to consult the roles mapping.
exports.determineRole = determineRole;
