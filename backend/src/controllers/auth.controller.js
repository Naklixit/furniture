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

const pickUser = (user) => {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  };
};

const unauthorized = (res) => res.status(401).json({ message: "Unauthorized" });

///Register

const register = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body || {};

    const fullNameResult = validateFullName(fullName);
    if (!fullNameResult.ok) {
      return res.status(400).json({ message: fullNameResult.message });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const passwordResult = validatePassword(password);
    if (!passwordResult.ok) {
      return res.status(400).json({ message: passwordResult.message });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(passwordResult.value, 10);

    const user = await User.create({
      fullName: fullNameResult.value,
      email: normalizedEmail,
      password: hashedPassword,
      role: "customer",
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    res.cookie("refreshToken", refreshToken, refreshCookieOptions());

    return res.status(201).json({
      message: "Register success",
      user: pickUser(user),
      accessToken,
    });
  } catch (err) {
    return next(err);
  }
};
//Login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (
      !normalizedEmail ||
      typeof password !== "string" ||
      password.length === 0
    ) {
      return res.status(400).json({ message: "Missing email or password" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Password-less accounts (e.g. Google login) cannot login via password flow
    if (!user.password) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    res.cookie("refreshToken", refreshToken, refreshCookieOptions());

    return res.json({
      message: "Login success",
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
        role: "customer",
      });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    res.cookie("refreshToken", refreshToken, refreshCookieOptions());

    return res.json({
      message: "Login success",
      user: pickUser(user),
      accessToken,
    });
  } catch (err) {
    return next(err);
  }
};

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
      message: "Refresh success",
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

  return res.json({ message: "Logout success" });
};

module.exports = {
  register,
  login,
  googleLogin,
  refresh,
  logout,
};
