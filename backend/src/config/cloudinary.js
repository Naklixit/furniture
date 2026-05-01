const cloudinary = require("cloudinary").v2;

const required = (key) => {
  const v = process.env[key];
  if (!v || !String(v).trim()) {
    const err = new Error(`Thiếu biến môi trường bắt buộc: ${key}`);
    err.statusCode = 500;
    throw err;
  }
  return v;
};

cloudinary.config({
  cloud_name: required("CLOUDINARY_CLOUD_NAME"),
  api_key: required("CLOUDINARY_API_KEY"),
  api_secret: required("CLOUDINARY_API_SECRET"),
});

module.exports = cloudinary;
