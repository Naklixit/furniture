const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeText = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
};

const normalizeCode = (value) => {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw.toUpperCase();
};

const parsePositiveInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
};

const computeSaleFinalPrice = (product) => {
  const original = Number(product?.originalPrice || 0);
  const sale = Number(product?.salePrice || 0);
  const hasSale = Number.isFinite(sale) && sale > 0 && sale < original;
  return Math.max(0, hasSale ? sale : original);
};

const getClientBaseUrl = () => {
  const url = String(process.env.CLIENT_URL || "").trim();
  if (url) return url.replace(/\/$/, "");
  return "http://localhost:5173";
};

const getClientBaseUrlFromRequest = (req) => {
  const origin =
    typeof req.headers?.origin === "string" ? req.headers.origin.trim() : "";
  const cleaned = origin ? origin.replace(/\/$/, "") : "";
  if (!cleaned) return "";

  const allowed = [process.env.CLIENT_URL]
    .filter(Boolean)
    .map((x) => String(x).trim().replace(/\/$/, ""));

  const isViteDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1):517\d{1,2}$/.test(
    cleaned,
  );
  if (isViteDevOrigin) return cleaned;
  if (allowed.includes(cleaned)) return cleaned;
  return "";
};

const getClientBaseUrlFromBody = (req) => {
  const raw =
    typeof req.body?.clientBaseUrl === "string"
      ? req.body.clientBaseUrl.trim()
      : "";
  const cleaned = raw ? raw.replace(/\/$/, "") : "";
  if (!cleaned) return "";

  const allowed = [process.env.CLIENT_URL]
    .filter(Boolean)
    .map((x) => String(x).trim().replace(/\/$/, ""));

  const isViteDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1):517\d{1,2}$/.test(
    cleaned,
  );
  if (isViteDevOrigin) return cleaned;
  if (allowed.includes(cleaned)) return cleaned;
  return "";
};

const getServerBaseUrl = (req) => {
  const env = String(process.env.SERVER_URL || "").trim();
  if (env) return env.replace(/\/$/, "");
  const proto = (
    req.headers["x-forwarded-proto"] ||
    req.protocol ||
    "http"
  ).toString();
  const host = (
    req.headers["x-forwarded-host"] ||
    req.get("host") ||
    "localhost:3000"
  ).toString();
  return `${proto}://${host}`;
};

const getIpAddress = (req) => {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0].trim();
  }
  return (
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "127.0.0.1"
  );
};

module.exports = {
  escapeRegex,
  normalizeText,
  normalizeCode,
  parsePositiveInt,
  computeSaleFinalPrice,
  getClientBaseUrl,
  getClientBaseUrlFromRequest,
  getClientBaseUrlFromBody,
  getServerBaseUrl,
  getIpAddress,
};
