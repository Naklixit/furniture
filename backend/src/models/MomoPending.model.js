const mongoose = require("mongoose");

const pendingItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    slug: { type: String, default: "", trim: true },
    name: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "", trim: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const momoPendingSchema = new mongoose.Schema(
  {
    momoOrderId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    requestId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    orderCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    customer: {
      fullName: { type: String, required: true, trim: true },
      phoneNumber: { type: String, default: "", trim: true },
      email: { type: String, default: "", trim: true },
    },

    shipping: {
      address: { type: String, required: true, trim: true },
      note: { type: String, default: "", trim: true },
    },

    items: { type: [pendingItemSchema], default: [] },

    subtotal: { type: Number, required: true, min: 0, default: 0 },
    shippingFee: { type: Number, required: true, min: 0, default: 0 },
    discount: {
      code: { type: String, default: "", trim: true, uppercase: true },
      percentOff: { type: Number, default: 0, min: 0, max: 100 },
      amount: { type: Number, default: 0, min: 0 },
    },
    total: { type: Number, required: true, min: 0, default: 0 },

    clientBaseUrl: { type: String, default: "", trim: true },

    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },

    momoCreate: { type: Object, default: null },
    momoCallback: { type: Object, default: null },

    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Auto cleanup after 24 hours
momoPendingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

module.exports = mongoose.model("MomoPending", momoPendingSchema);
