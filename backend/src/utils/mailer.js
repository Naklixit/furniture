const nodemailer = require("nodemailer");

const isProd = process.env.NODE_ENV === "production";

const getEnv = (key, fallback = "") => {
  const value = process.env[key];
  if (value && value.trim().length > 0) return value;
  if (isProd && fallback === "") {
    const err = new Error(`Missing required env: ${key}`);
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
  return `No Reply <${user}>`;
};

const sendPasswordResetOtpEmail = async ({
  to,
  fullName,
  otp,
  minutes = 10,
}) => {
  if (!isEmailConfigured()) {
    if (isProd) {
      const err = new Error(
        "Email service is not configured (missing SMTP_USER/SMTP_PASS)",
      );
      err.statusCode = 500;
      throw err;
    }

    // Dev fallback: log OTP so you can continue testing the flow.
    // eslint-disable-next-line no-console
    console.log(
      `[DEV] Password reset OTP for ${to}: ${otp} (expires in ${minutes}m)`,
    );
    return;
  }

  const subject = "Your password reset code";
  const greeting = fullName ? `Hi ${fullName},` : "Hi,";

  const text = `${greeting}\n\nYour OTP code is: ${otp}\nThis code expires in ${minutes} minutes.\n\nIf you did not request a password reset, you can ignore this email.\n`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
      <p>${greeting}</p>
      <p>Your OTP code is:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${otp}</p>
      <p>This code expires in <b>${minutes} minutes</b>.</p>
      <p style="color:#555;">If you did not request a password reset, you can ignore this email.</p>
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
