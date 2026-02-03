const bcrypt = require("bcrypt");
const otpGenerator = require("otp-generator");

const User = require("../models/User.model");
const PasswordResetOtp = require("../models/PasswordResetOtp.model");
const { normalizeEmail, validatePassword } = require("../utils/authValidation");
const {
  signPasswordResetToken,
  verifyPasswordResetToken,
} = require("../utils/tokens");
const { sendPasswordResetOtpEmail } = require("../utils/mailer");

const OTP_LENGTH = 6;
const OTP_MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_MS = 60 * 1000;
const DEFAULT_OTP_MINUTES = 10;

const httpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const genericForgotPasswordMessage =
  "If the email exists, we sent an OTP code to reset your password.";

const getOtpMinutes = () => {
  const minutes = Number(process.env.PASSWORD_RESET_OTP_MINUTES);
  if (Number.isFinite(minutes) && minutes > 0) return minutes;
  return DEFAULT_OTP_MINUTES;
};

const generateOtp = () => {
  return otpGenerator.generate(OTP_LENGTH, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });
};

const isExpired = (date) => {
  if (!date) return true;
  return Date.now() > new Date(date).getTime();
};

const parseResetTokenPayload = (resetToken) => {
  const payload = verifyPasswordResetToken(resetToken);
  if (payload?.tokenType !== "password_reset") return null;
  const userId = payload?.sub;
  const otpId = payload?.otpId;
  if (!userId || !otpId) return null;
  return { userId, otpId };
};

const requestPasswordReset = async ({ email }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw httpError(400, "Email is required");
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return { message: genericForgotPasswordMessage };
  }

  const existing = await PasswordResetOtp.findOne({ userId: user._id });
  const lastSentAtMs = existing?.lastSentAt
    ? new Date(existing.lastSentAt).getTime()
    : 0;
  if (lastSentAtMs && Date.now() - lastSentAtMs < OTP_COOLDOWN_MS) {
    return { message: genericForgotPasswordMessage };
  }

  const otp = generateOtp();
  const otpMinutes = getOtpMinutes();
  const expiresAt = new Date(Date.now() + otpMinutes * 60 * 1000);

  const otpHash = await bcrypt.hash(String(otp), 10);
  const record = await PasswordResetOtp.findOneAndUpdate(
    { userId: user._id },
    {
      userId: user._id,
      email: user.email,
      otpHash,
      expiresAt,
      verifiedAt: null,
      usedAt: null,
      attempts: 0,
      lastSentAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await sendPasswordResetOtpEmail({
    to: user.email,
    fullName: user.fullName,
    otp,
    minutes: otpMinutes,
  });

  return { message: genericForgotPasswordMessage, otpId: record?._id };
};

const verifyPasswordResetOtp = async ({ email, otp }) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || typeof otp !== "string" || otp.trim().length === 0) {
    throw httpError(400, "Missing email or otp");
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw httpError(400, "Invalid or expired OTP");
  }

  const record = await PasswordResetOtp.findOne({ userId: user._id });
  if (!record || record.usedAt) {
    throw httpError(400, "Invalid or expired OTP");
  }

  if (!record.otpHash || isExpired(record.expiresAt)) {
    throw httpError(400, "Invalid or expired OTP");
  }

  const attempts = Number(record.attempts || 0);
  if (attempts >= OTP_MAX_ATTEMPTS) {
    throw httpError(400, "Invalid or expired OTP");
  }

  const ok = await bcrypt.compare(String(otp), record.otpHash);
  if (!ok) {
    record.attempts = attempts + 1;
    await record.save();
    throw httpError(400, "Invalid or expired OTP");
  }

  record.verifiedAt = new Date();
  record.attempts = 0;
  await record.save();

  const resetToken = signPasswordResetToken(user, record._id);
  return { message: "OTP verified", resetToken };
};

const resetPasswordWithToken = async ({
  resetToken,
  password,
  confirmPassword,
}) => {
  if (typeof resetToken !== "string" || resetToken.trim().length === 0) {
    throw httpError(400, "Missing resetToken");
  }

  if (password !== confirmPassword) {
    throw httpError(400, "Passwords do not match");
  }

  const passwordResult = validatePassword(password);
  if (!passwordResult.ok) {
    throw httpError(400, passwordResult.message);
  }

  let parsed;
  try {
    parsed = parseResetTokenPayload(resetToken);
  } catch (e) {
    throw httpError(401, "Invalid or expired reset token");
  }

  if (!parsed) {
    throw httpError(401, "Invalid or expired reset token");
  }

  const { userId, otpId } = parsed;

  const user = await User.findById(userId);
  if (!user) {
    throw httpError(401, "Invalid or expired reset token");
  }

  const record = await PasswordResetOtp.findById(otpId);
  if (!record) {
    throw httpError(401, "Invalid or expired reset token");
  }

  if (String(record.userId) !== String(user._id)) {
    throw httpError(401, "Invalid or expired reset token");
  }

  if (record.usedAt || !record.verifiedAt || isExpired(record.expiresAt)) {
    throw httpError(401, "Invalid or expired reset token");
  }

  user.password = await bcrypt.hash(passwordResult.value, 10);
  await user.save();

  record.usedAt = new Date();
  await record.save();

  return { message: "Password reset success" };
};

module.exports = {
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPasswordWithToken,
};
