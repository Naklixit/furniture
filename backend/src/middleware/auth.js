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
    if (!token)
      return res.status(401).json({ message: "Không có quyền truy cập" });

    const payload = verifyAccessToken(token);
    const userId = payload?.sub;
    if (!userId)
      return res.status(401).json({ message: "Không có quyền truy cập" });

    req.auth = {
      userId,
      role: payload.role,
      email: payload.email,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ message: "Không có quyền truy cập" });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    if (!token) return next();

    const payload = verifyAccessToken(token);
    const userId = payload?.sub;
    if (!userId) return next();

    req.auth = {
      userId,
      role: payload.role,
      email: payload.email,
    };

    return next();
  } catch {
    // ignore invalid token for public routes
    return next();
  }
};

const requireAdmin = async (req, res, next) => {
  await requireAuth(req, res, async (err) => {
    if (err) return next(err);

    if (req.auth?.role === "admin") return next();

    // An toàn bổ sung: nếu token thiếu role thì fallback kiểm tra từ DB
    if (!req.auth?.userId) {
      return res.status(403).json({ message: "Không đủ quyền" });
    }

    const user = await User.findById(req.auth.userId).select("role");
    if (user?.role !== "admin") {
      return res.status(403).json({ message: "Không đủ quyền" });
    }

    req.auth.role = "admin";
    return next();
  });
};

module.exports = { requireAuth, optionalAuth, requireAdmin };
