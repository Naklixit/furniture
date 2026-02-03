const User = require("../models/User.model");
const { verifyAccessToken } = require("../utils/tokens");

const getBearerToken = (req) => {
  const header = req.headers?.authorization;
  if (!header || typeof header !== "string") return null;
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
};

const requireAuth = async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const payload = verifyAccessToken(token);
    const userId = payload?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    req.auth = {
      userId,
      role: payload.role,
      email: payload.email,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

const requireAdmin = async (req, res, next) => {
  await requireAuth(req, res, async (err) => {
    if (err) return next(err);

    if (req.auth?.role === "admin") return next();

    // Optional safety: if role is missing, fall back to DB check
    if (!req.auth?.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await User.findById(req.auth.userId).select("role");
    if (user?.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    req.auth.role = "admin";
    return next();
  });
};

module.exports = { requireAuth, requireAdmin };
