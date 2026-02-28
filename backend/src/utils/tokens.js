const jwt = require("jsonwebtoken");

const isProd = process.env.NODE_ENV === "production";

const getRequiredSecret = (envKey, fallback) => {
  const value = process.env[envKey];
  if (value && value.trim().length > 0) return value;

  if (isProd) {
    const err = new Error(`Thiếu biến môi trường bắt buộc: ${envKey}`);
    err.statusCode = 500;
    throw err;
  }

  return fallback;
};

const ACCESS_SECRET = () =>
  getRequiredSecret("JWT_ACCESS_SECRET", "dev_access_secret_change_me");
const REFRESH_SECRET = () =>
  getRequiredSecret("JWT_REFRESH_SECRET", "dev_refresh_secret_change_me");
const PASSWORD_RESET_SECRET = () =>
  getRequiredSecret(
    "JWT_PASSWORD_RESET_SECRET",
    "dev_password_reset_secret_change_me",
  );

const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN;
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN;
const PASSWORD_RESET_EXPIRES_IN = process.env.JWT_PASSWORD_RESET_EXPIRES_IN;

const signAccessToken = (user) => {
  return jwt.sign(
    {
      role: user.role,
      email: user.email,
    },
    ACCESS_SECRET(),
    {
      subject: String(user._id),
      expiresIn: ACCESS_EXPIRES_IN,
    },
  );
};

const signRefreshToken = (user) => {
  return jwt.sign(
    {
      tokenType: "refresh",
    },
    REFRESH_SECRET(),
    {
      subject: String(user._id),
      expiresIn: REFRESH_EXPIRES_IN,
    },
  );
};

const signPasswordResetToken = (user, otpId) => {
  return jwt.sign(
    {
      tokenType: "password_reset",
      otpId: otpId ? String(otpId) : "",
    },
    PASSWORD_RESET_SECRET(),
    {
      subject: String(user._id),
      expiresIn: PASSWORD_RESET_EXPIRES_IN,
    },
  );
};

const verifyAccessToken = (token) => jwt.verify(token, ACCESS_SECRET());
const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_SECRET());
const verifyPasswordResetToken = (token) =>
  jwt.verify(token, PASSWORD_RESET_SECRET());

const refreshCookieOptions = () => {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/api/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  signPasswordResetToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyPasswordResetToken,
  refreshCookieOptions,
};
