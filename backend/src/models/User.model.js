const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      default: "",
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: (v) => v === "" || /^\d{10}$/.test(v),
        message: "Số điện thoại phải gồm đúng 10 chữ số",
      },
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      enum: ["customer", "admin"], 
      default: "customer",
    },
  },
  { timestamps: true },
);

userSchema.index(
  { phoneNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      phoneNumber: { $type: "string", $ne: "" },
    },
  },
);

module.exports = mongoose.model("User", userSchema);
