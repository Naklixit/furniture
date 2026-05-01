const nodemailer = require("nodemailer");

const isProd = process.env.NODE_ENV === "production";

const getEnv = (key, fallback = "") => {
  const value = process.env[key];
  if (value && value.trim().length > 0) return value;
  if (isProd && fallback === "") {
    const err = new Error(`Thiếu biến môi trường bắt buộc: ${key}`);
    err.statusCode = 500;
    throw err;
  }
  return fallback;
};

let cachedTransport = null;

const getTransport = () => {
  if (cachedTransport) return cachedTransport;

  const service = getEnv("SMTP_SERVICE");
  const host = getEnv("SMTP_HOST", "smtp.gmail.com");
  const port = Number(getEnv("SMTP_PORT", "587"));
  const user = getEnv("SMTP_USER");
  const pass = getEnv("SMTP_PASS");

  const transportConfig = service
    ? {
        service,
        auth: { user, pass },
      }
    : {
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      };

  cachedTransport = nodemailer.createTransport(transportConfig);
  return cachedTransport;
};

const isEmailConfigured = () => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return Boolean(
    user && user.trim().length > 0 && pass && pass.trim().length > 0,
  );
};

const getFrom = () => {
  const from = getEnv("SMTP_FROM");
  if (from) return from;
  const user = getEnv("SMTP_USER", "no-reply@example.com");
  return `Không trả lời <${user}>`;
};

const sendPasswordResetOtpEmail = async ({
  to,
  fullName,
  otp,
  minutes = 3,
}) => {
  if (!isEmailConfigured()) {
    if (isProd) {
      const err = new Error(
        "Dịch vụ email chưa được cấu hình (thiếu SMTP_USER/SMTP_PASS)",
      );
      err.statusCode = 500;
      throw err;
    }
    return;
  }

  const subject = "Mã OTP đặt lại mật khẩu";
  const greeting = fullName ? `Xin chào ${fullName},` : "Xin chào,";

  const text = `${greeting}\n\nMã OTP của bạn là: ${otp}\nMã này có hiệu lực trong ${minutes} phút.\nLưu ý: Bạn chỉ có thể yêu cầu gửi OTP tối đa 3 lần trong 1 ngày.\n\nNếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.\n`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>${greeting}</p>
      <p>Mã OTP để đặt lại mật khẩu của bạn là:</p>
      <p style="font-size: 28px; font-weight: 800; letter-spacing: 3px; margin: 12px 0;">${otp}</p>
      <p>Mã này có hiệu lực trong <b>${minutes} phút</b>.</p>
      <p style="margin-top: 10px; color:#333;">
        <b>Lưu ý:</b> Bạn chỉ có thể yêu cầu gửi OTP tối đa <b>3 lần</b> trong <b>1 ngày</b>.
      </p>
      <p style="color:#555;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
    </div>
  `;

  const transport = getTransport();
  await transport.sendMail({
    from: getFrom(),
    to,
    subject,
    text,
    html,
  });
};

module.exports = {
  sendPasswordResetOtpEmail,
};
