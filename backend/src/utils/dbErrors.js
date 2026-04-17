// Các helper xử lý lỗi DB dùng chung.
// Lưu ý: Mongo/Mongoose có nhiều dạng thông báo duplicate key nên cần check cả code lẫn message.

const isDuplicateKeyError = (err) => {
  const code = err?.code;
  const msg = String(err?.message || "").toLowerCase();
  return (
    code === 11000 ||
    msg.includes("duplicate key") ||
    msg.includes("e11000 duplicate key") ||
    msg.includes("e11000")
  );
};

module.exports = {
  isDuplicateKeyError,
};

