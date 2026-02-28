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
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS);
const OTP_COOLDOWN_MS = 60 * 1000;
const DEFAULT_OTP_MINUTES = Number(process.env.PASSWORD_RESET_OTP_MINUTES);
const OTP_MAX_SENDS_PER_DAY = 3;
const OTP_DAILY_LIMIT_CODE = "OTP_DAILY_LIMIT";

const httpError = (statusCode, message, code) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
};

const genericForgotPasswordMessage =
  "Nếu email tồn tại trong hệ thống, một mã OTP đã được gửi để đặt lại mật khẩu.";

const otpSentMessage = (minutes) =>
  `OTP đã được gửi đến email của bạn. Mã có hiệu lực ${minutes} phút.`;

const otpDailyLimitMessage =
  "Bạn đã hết số lần gửi OTP trong ngày. Vui lòng đợi đến ngày mai để thử lại.";

const otpCooldownMessage =
  "Bạn vừa yêu cầu OTP. Vui lòng đợi ít nhất 60 giây rồi thử lại.";

const isDailyLimited = (record, todayKey) => {
  if (!record) return false;
  if (record.dailySentDate !== todayKey) return false;
  return Number(record.dailySentCount || 0) >= OTP_MAX_SENDS_PER_DAY;
};

const getOtpMinutes = () => {
  const minutes = DEFAULT_OTP_MINUTES;
  // if (Number.isFinite(minutes) && minutes > 0) {
  //   return Math.min(minutes, DEFAULT_OTP_MINUTES);
  // }
  return minutes;
};

const getDayKey = (date = new Date()) => {
  // YYYY-MM-DD (theo múi giờ của server)
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
    throw httpError(400, "Email là bắt buộc");
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return { message: genericForgotPasswordMessage };
  }

  const existing = await PasswordResetOtp.findOne({ userId: user._id });
  const todayKey = getDayKey();

  const currentDailyCount = (() => {
    if (!existing) return 0;
    if (existing.dailySentDate !== todayKey) return 0;
    return Number(existing.dailySentCount || 0);
  })();

  if (existing && currentDailyCount >= OTP_MAX_SENDS_PER_DAY) {
    throw httpError(429, otpDailyLimitMessage, OTP_DAILY_LIMIT_CODE);
  }

  const lastSentAtMs = existing?.lastSentAt
    ? new Date(existing.lastSentAt).getTime()
    : 0;
  if (lastSentAtMs && Date.now() - lastSentAtMs < OTP_COOLDOWN_MS) {
    return { message: otpCooldownMessage };
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
      dailySentDate: todayKey,
      dailySentCount:
        (existing?.dailySentDate === todayKey
          ? Number(existing?.dailySentCount || 0)
          : 0) + 1,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await sendPasswordResetOtpEmail({
    to: user.email,
    fullName: user.fullName,
    otp,
    minutes: otpMinutes,
  });

  return { message: otpSentMessage(otpMinutes), otpId: record?._id };
};

const verifyPasswordResetOtp = async ({ email, otp }) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || typeof otp !== "string" || otp.trim().length === 0) {
    throw httpError(400, "Thiếu email hoặc mã OTP");
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw httpError(400, "Mã OTP không hợp lệ hoặc đã hết hạn");
  }

  const record = await PasswordResetOtp.findOne({ userId: user._id });
  if (!record || record.usedAt) {
    throw httpError(400, "Mã OTP không hợp lệ hoặc đã hết hạn");
  }

  const todayKey = getDayKey();
  if (isDailyLimited(record, todayKey)) {
    throw httpError(429, otpDailyLimitMessage, OTP_DAILY_LIMIT_CODE);
  }

  if (!record.otpHash || isExpired(record.expiresAt)) {
    throw httpError(400, "Mã OTP không hợp lệ hoặc đã hết hạn");
  }

  const attempts = Number(record.attempts || 0);
  if (attempts >= OTP_MAX_ATTEMPTS) {
    throw httpError(400, "Mã OTP không hợp lệ hoặc đã hết hạn");
  }

  const ok = await bcrypt.compare(String(otp), record.otpHash);
  if (!ok) {
    record.attempts = attempts + 1;
    await record.save();
    throw httpError(400, "Mã OTP không hợp lệ hoặc đã hết hạn");
  }

  record.verifiedAt = new Date();
  record.attempts = 0;
  await record.save();

  const resetToken = signPasswordResetToken(user, record._id);
  return { message: "Xác thực OTP thành công", resetToken };
};

const resetPasswordWithToken = async ({
  resetToken,
  password,
  confirmPassword,
}) => {
  if (typeof resetToken !== "string" || resetToken.trim().length === 0) {
    throw httpError(400, "Thiếu resetToken");
  }

  if (password !== confirmPassword) {
    throw httpError(400, "Mật khẩu không khớp");
  }

  const passwordResult = validatePassword(password);
  if (!passwordResult.ok) {
    throw httpError(400, passwordResult.message);
  }

  let parsed;
  try {
    parsed = parseResetTokenPayload(resetToken);
  } catch (e) {
    throw httpError(401, "Reset token không hợp lệ hoặc đã hết hạn");
  }

  if (!parsed) {
    throw httpError(401, "Reset token không hợp lệ hoặc đã hết hạn");
  }

  const { userId, otpId } = parsed;

  const user = await User.findById(userId);
  if (!user) {
    throw httpError(401, "Reset token không hợp lệ hoặc đã hết hạn");
  }

  const record = await PasswordResetOtp.findById(otpId);
  if (!record) {
    throw httpError(401, "Reset token không hợp lệ hoặc đã hết hạn");
  }

  const todayKey = getDayKey();
  if (isDailyLimited(record, todayKey)) {
    throw httpError(429, otpDailyLimitMessage, OTP_DAILY_LIMIT_CODE);
  }

  if (String(record.userId) !== String(user._id)) {
    throw httpError(401, "Reset token không hợp lệ hoặc đã hết hạn");
  }

  if (record.usedAt || !record.verifiedAt || isExpired(record.expiresAt)) {
    throw httpError(401, "Reset token không hợp lệ hoặc đã hết hạn");
  }

  user.password = await bcrypt.hash(passwordResult.value, 10);
  await user.save();

  record.usedAt = new Date();
  await record.save();

  return { message: "Đặt lại mật khẩu thành công" };
};

module.exports = {
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPasswordWithToken,
};
