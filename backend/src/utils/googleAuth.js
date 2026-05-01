const { OAuth2Client } = require("google-auth-library");

const isProd = process.env.NODE_ENV === "production";

const getRequiredEnv = (key, fallback = "") => {
  const value = process.env[key];
  if (value && value.trim().length > 0) return value;
  if (isProd && !fallback) {
    const err = new Error(`Thiếu biến môi trường bắt buộc: ${key}`);
    err.statusCode = 500;
    throw err;
  }
  return fallback;
};

const getGoogleClientId = () =>
  getRequiredEnv("GOOGLE_CLIENT_ID", "dev_google_client_id");

let cachedClient = null;

const getClient = () => {
  if (cachedClient) return cachedClient;
  cachedClient = new OAuth2Client(getGoogleClientId());
  return cachedClient;
};

const verifyGoogleIdToken = async (idToken) => {
  if (typeof idToken !== "string" || idToken.trim().length === 0) {
    const err = new Error("Thiếu thông tin xác thực Google");
    err.statusCode = 400;
    throw err;
  }

  const client = getClient();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: getGoogleClientId(),
  });

  const payload = ticket.getPayload();
  if (!payload) {
    const err = new Error("Thông tin xác thực Google không hợp lệ");
    err.statusCode = 401;
    throw err;
  }

  const email = payload.email;
  const name = payload.name;
  const emailVerified = payload.email_verified;

  if (!email) {
    const err = new Error("Tài khoản Google thiếu email");
    err.statusCode = 400;
    throw err;
  }

  if (emailVerified === false) {
    const err = new Error("Email tài khoản Google chưa được xác minh");
    err.statusCode = 401;
    throw err;
  }

  return { email, name: name || "" };
};

module.exports = {
  verifyGoogleIdToken,
};
