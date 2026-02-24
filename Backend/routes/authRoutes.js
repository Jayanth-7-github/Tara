const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  logout,
  getMe,
  checkLogin,
  verifyEventKey,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const { delegate } = require("../engine/router");

router.post("/signup", delegate("signup", signup));
router.post("/login", delegate("login", login));
router.post("/logout", delegate("logout", logout));
router.get("/me", protect, delegate("getMe", getMe));
router.get("/check-login", protect, delegate("checkLogin", checkLogin));
router.post("/verify-event-key", delegate("verifyEventKey", verifyEventKey));

module.exports = router;
