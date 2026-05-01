const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true, index: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    brand: {
      type: String,
      default: "",
      trim: true,
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    salePrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    specs: {
      dimensions: {
        length: { type: Number, required: true, min: 0 },
        width: { type: Number, required: true, min: 0 },
        height: { type: Number, required: true, min: 0 },
        unit: { type: String, default: "cm" },
      },
      weight: {
        value: { type: Number, default: 0, min: 0 },
        unit: { type: String, default: "kg" },
      },
      extra: {
        type: Map,
        of: String,
        default: {},
      },
    },
    images: {
      main: { type: imageSchema, default: null },
      gallery: { type: [imageSchema], default: [] },
    },
    ratingAvg: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

productSchema.index({ name: "text", slug: "text", brand: "text" });

module.exports = mongoose.model("Product", productSchema);
