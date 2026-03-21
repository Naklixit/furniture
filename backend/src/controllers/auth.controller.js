// controllers/auth.controller.js
const bcrypt = require("bcrypt");
const User = require("../models/User.model");
const {
  validateFullName,
  validatePassword,
  normalizeEmail,
} = require("../utils/authValidation");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  refreshCookieOptions,
} = require("../utils/tokens");
const { verifyGoogleIdToken } = require("../utils/googleAuth");
const {
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPasswordWithToken,
} = require("../services/passwordReset.service");

const pickUser = (user) => {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber || "",
    address: user.address || "",
    role: user.role,
  };
};

const unauthorized = (res) =>
  res.status(401).json({ message: "Không có quyền truy cập" });

/// Đăng ký

const register = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body || {};

    const fullNameResult = validateFullName(fullName);
    if (!fullNameResult.ok) {
      return res.status(400).json({ message: fullNameResult.message });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email là bắt buộc" });
    }

    const passwordResult = validatePassword(password);
    if (!passwordResult.ok) {
      return res.status(400).json({ message: passwordResult.message });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const hashedPassword = await bcrypt.hash(passwordResult.value, 10);

    const user = await User.create({
      fullName: fullNameResult.value,
      email: normalizedEmail,
      password: hashedPassword,
      phoneNumber: "",
      address: "",
      role: "customer",
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    res.cookie("refreshToken", refreshToken, refreshCookieOptions());

    return res.status(201).json({
      message: "Đăng ký thành công",
      user: pickUser(user),
      accessToken,
    });
  } catch (err) {
    return next(err);
  }
};
// Đăng nhập
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (
      !normalizedEmail ||
      typeof password !== "string" ||
      password.length === 0
    ) {
      return res.status(400).json({ message: "Thiếu email hoặc mật khẩu" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Email hoặc mật khẩu không đúng" });
    }

    // Tài khoản không có mật khẩu (ví dụ đăng nhập Google) không thể đăng nhập bằng mật khẩu
    if (!user.password) {
      return res
        .status(400)
        .json({ message: "Email hoặc mật khẩu không đúng" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Email hoặc mật khẩu không đúng" });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    res.cookie("refreshToken", refreshToken, refreshCookieOptions());

    return res.json({
      message: "Đăng nhập thành công",
      user: pickUser(user),
      accessToken,
    });
  } catch (err) {
    return next(err);
  }
};

const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body || {};
    const { email, name } = await verifyGoogleIdToken(credential);

    const normalizedEmail = normalizeEmail(email);
    const fullName = (name || "").trim() || normalizedEmail.split("@")[0];

    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = await User.create({
        fullName,
        email: normalizedEmail,
        password: "",
        phoneNumber: "",
        address: "",
        role: "customer",
      });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    res.cookie("refreshToken", refreshToken, refreshCookieOptions());

    return res.json({
      message: "Đăng nhập thành công",
      user: pickUser(user),
      accessToken,
    });
  } catch (err) {
    return next(err);
  }
};
//Làm mới Token
const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return unauthorized(res);

    const payload = verifyRefreshToken(token);
    if (payload?.tokenType !== "refresh") {
      return unauthorized(res);
    }

    const userId = payload?.sub;
    if (!userId) return unauthorized(res);

    const user = await User.findById(userId);
    if (!user) return unauthorized(res);

    const accessToken = signAccessToken(user);
    const nextRefreshToken = signRefreshToken(user);
    res.cookie("refreshToken", nextRefreshToken, refreshCookieOptions());

    return res.json({
      message: "Làm mới phiên đăng nhập thành công",
      accessToken,
      user: pickUser(user),
    });
  } catch (err) {
    return next(err);
  }
};

const logout = async (req, res) => {
  res.clearCookie("refreshToken", {
    ...refreshCookieOptions(),
    maxAge: 0,
  });

  return res.json({ message: "Đăng xuất thành công" });
};

// Quên mật khẩu / OTP / Đặt lại mật khẩu
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    const result = await requestPasswordReset({ email });
    return res.json({ message: result.message });
  } catch (err) {
    return next(err);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body || {};
    const result = await verifyPasswordResetOtp({ email, otp });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, password, confirmPassword } = req.body || {};
    const result = await resetPasswordWithToken({
      resetToken,
      password,
      confirmPassword,
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  refresh,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
};
