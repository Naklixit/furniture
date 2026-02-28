const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
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

const orderSchema = new mongoose.Schema(
  {
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

    items: { type: [orderItemSchema], default: [] },

    subtotal: { type: Number, required: true, min: 0, default: 0 },
    shippingFee: { type: Number, required: true, min: 0, default: 0 },
    discount: {
      code: { type: String, default: "", trim: true, uppercase: true },
      percentOff: { type: Number, default: 0, min: 0, max: 100 },
      amount: { type: Number, default: 0, min: 0 },
      consumed: { type: Boolean, default: false },
    },
    total: { type: Number, required: true, min: 0, default: 0 },

    payment: {
      method: {
        type: String,
        enum: ["COD", "VNPAY", "MOMO"],
        required: true,
        index: true,
      },
      status: {
        type: String,
        enum: ["pending", "unpaid", "paid", "failed"],
        default: "unpaid",
        index: true,
      },
      paidAt: { type: Date, default: null },
      vnpay: {
        txnRef: { type: String, default: "", trim: true, index: true },
        clientBaseUrl: { type: String, default: "", trim: true },
        transactionNo: { type: String, default: "", trim: true },
        bankCode: { type: String, default: "", trim: true },
        payDate: { type: String, default: "", trim: true },
        responseCode: { type: String, default: "", trim: true },
        rawReturn: { type: Object, default: null },
      },
    },

    status: {
      type: String,
      enum: ["pending", "shipping", "completed", "cancelled"],
      default: "pending",
      index: true,
    },

    
    inventoryAdjusted: { type: Boolean, default: false, index: true },
    inventoryAdjustedAt: { type: Date, default: null },
    inventoryRestoredAt: { type: Date, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

orderSchema.index({ orderCode: "text" });

module.exports = mongoose.model("Order", orderSchema);
