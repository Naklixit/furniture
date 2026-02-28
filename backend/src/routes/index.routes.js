const authRouter = require("./auth.route");
const userRouter = require("./user.route");
const categoryRouter = require("./category.route");
const productRouter = require("./product.route");
const discountCodeRouter = require("./discountCode.route");

module.exports = (app) => {
  app.use("/api/auth", authRouter);
  app.use("/api/users", userRouter);
  app.use("/api/categories", categoryRouter);
  app.use("/api/products", productRouter);
  app.use("/api/discount-codes", discountCodeRouter);
  // app.use("/api", authRouter);
};
