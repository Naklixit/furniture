const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const connectDB = require("./config/connectDB.js");
const routes = require("./routes/index.routes.js");
const app = express();
const port = process.env.PORT || 3000;
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
      return callback(new Error(`CORS blocked for origin: ${origin}`));
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
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message || "Lỗi server",
  });
});
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
