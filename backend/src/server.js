const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const connectDB = require("./config/connectDB.js");
const routes = require("./routes/index.routes.js");
const app = express();
const port = 3000;
// Middleware
const allowedOrigins = [process.env.CLIENT_URL].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isViteDevOrigin =
        /^http:\/\/(localhost|127\.0\.0\.1):517\d{1,2}$/.test(origin);
      if (isViteDevOrigin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS bị chặn cho origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
connectDB();
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
