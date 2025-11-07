const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  logout,
  getMe,
  checkLogin,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.get("/check-login", protect, checkLogin);

module.exports = router;
