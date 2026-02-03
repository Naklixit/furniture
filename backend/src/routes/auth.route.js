// routes/auth.route.js
const express = require("express");
const router = express.Router();
const {
  register,
  login,
  googleLogin,
  refresh,
  logout,
} = require("../controllers/auth.controller");

const {
  forgotPassword,
  verifyOtp,
  resetPassword,
} = require("../controllers/passwordReset.controller");

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);
router.post("/refresh", refresh);
router.post("/logout", logout);

router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

module.exports = router;
