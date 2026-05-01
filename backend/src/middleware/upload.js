const multer = require("multer");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ok = /^image\//.test(file.mimetype || "");
  if (!ok) {
    const err = new Error("Chỉ hỗ trợ upload file ảnh");
    err.statusCode = 400;
    return cb(err);
  }
  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 12,
  },
});

module.exports = { upload };
