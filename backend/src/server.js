const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
// Load .env only for local development to avoid overriding platform env vars.
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const connectDB = require("./config/connectDB.js");
const routes = require("./routes/index.routes.js");
const app = express();
const port = Number(process.env.PORT) || 3000;
// Middleware
const allowedOrigins = [process.env.CLIENT_URL]
  .filter(Boolean)
  .map((x) => String(x).trim().replace(/\/$/, ""));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanedOrigin = String(origin).trim().replace(/\/$/, "");
      const isViteDevOrigin =
        /^http:\/\/(localhost|127\.0\.0\.1):517\d{1,2}$/.test(cleanedOrigin);
      if (isViteDevOrigin) return callback(null, true);
      if (allowedOrigins.includes(cleanedOrigin)) return callback(null, true);
      return callback(new Error(`CORS bị chặn cho origin: ${cleanedOrigin}`));
    },
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
connectDB().then(async () => {
  try {
    const mongoose = require("mongoose");
    const reviewCol = mongoose.connection.collection("reviews");
    const indexes = await reviewCol.indexes();
    const oldIdx = indexes.find(
      (idx) =>
        idx.unique &&
        idx.key?.userId === 1 &&
        idx.key?.productId === 1 &&
        !idx.key?.orderId,
    );
    if (oldIdx) {
      await reviewCol.dropIndex(oldIdx.name);
      console.log(`[migrate] Dropped old review index "${oldIdx.name}"`);
    }
  } catch (e) {
    // Ignore if collection/index doesn't exist yet
    if (!/ns not found|index not found/i.test(String(e?.message || ""))) {
      console.warn("[migrate] Review index migration warning:", e?.message);
    }
  }
});
routes(app);
app.use((err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Lỗi server";

  // Multer errors
  if (err && err.code === "LIMIT_FILE_SIZE") {
    statusCode = 400;
    message = "File ảnh tối đa 10MB";
  }
  if (err && err.code === "LIMIT_FILE_COUNT") {
    statusCode = 400;
    message = "Số lượng file upload vượt giới hạn";
  }
  if (err && err.code === "LIMIT_UNEXPECTED_FILE") {
    statusCode = 400;
    message = "Trường upload không hợp lệ";
  }

  const payload = {
    success: false,
    message,
  };
  if (err.code) payload.code = err.code;
  return res.status(statusCode).json(payload);
});
app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});
