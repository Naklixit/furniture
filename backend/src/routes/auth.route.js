const express = require("express");
const router = express.Router();
const {
  register,
  login,
  googleLogin,
  refresh,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
} = require("../controllers/auth.controller");

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);
router.post("/refresh", refresh);
router.post("/logout", logout);

router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

module.exports = router;
