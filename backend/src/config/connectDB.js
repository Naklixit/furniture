const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
  } catch (error) {
    console.error("Kết nối MongoDB thất bại:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
