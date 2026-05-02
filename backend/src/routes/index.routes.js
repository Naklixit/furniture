const authRouter = require("./auth.route");
const userRouter = require("./user.route");
const categoryRouter = require("./category.route");
const productRouter = require("./product.route");
const discountCodeRouter = require("./discountCode.route");
const orderRouter = require("./order.route");
const geoRouter = require("./geo.route");
const reviewRouter = require("./review.route");
const aiRouter = require("./ai.route");
const statsRouter = require("./stats.route");

module.exports = (app) => {
  app.use("/api/auth", authRouter);
  app.use("/api/users", userRouter);
  app.use("/api/categories", categoryRouter);
  app.use("/api/products", productRouter);
  app.use("/api/discount-codes", discountCodeRouter);
  app.use("/api/orders", orderRouter);
  app.use("/api/geo", geoRouter);
  app.use("/api/reviews", reviewRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/stats", statsRouter);
};
