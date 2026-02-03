const authRouter = require("./auth.route");

module.exports = (app) => {
  app.use("/api/auth", authRouter);
  // app.use("/api", authRouter);
};
