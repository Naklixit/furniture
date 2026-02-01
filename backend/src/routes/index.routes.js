const authRouter = require("./auth.route");

module.exports = (app) => {
  app.use("/api/auth", authRouter);
  // Backwards-compatible aliases (so clients can call /api/register, /api/login)
  app.use("/api", authRouter);
};
