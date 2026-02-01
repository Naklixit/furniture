// controllers/auth.controller.js
const bcrypt = require("bcrypt");
const User = require("../models/User.model");
const {
  validateFullName,
  validatePassword,
  normalizeEmail,
} = require("../utils/authValidation");
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

    return res.status(201).json({
      message: "Register success",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    return res.json({
      message: "Login success",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { register, login };
