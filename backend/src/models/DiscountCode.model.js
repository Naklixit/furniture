const mongoose = require("mongoose");

const discountCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },
    percentOff: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingUses: {
      type: Number,
      default: 0,
      min: 0,
    },
    usedBy: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
      index: true,
    },
    startsAt: {
      type: Date,
      default: null,
      index: true,
    },
    endsAt: {
      type: Date,
      default: null,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

discountCodeSchema.index({ code: "text" });

module.exports = mongoose.model("DiscountCode", discountCodeSchema);
