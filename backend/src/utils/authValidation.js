const validateFullName = (value) => {
  if (typeof value !== "string") {
    return { ok: false, message: "Họ tên là bắt buộc" };
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: "Họ tên không được để trống" };
  }
  const normalized = trimmed.replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > 50) {
    return { ok: false, message: "Họ tên phải có độ dài từ 2 đến 50 ký tự" };
  }
  if (!/^[\p{L}\p{M}]+(?: [\p{L}\p{M}]+)*$/u.test(normalized)) {
    return {
      ok: false,
      message: "Họ tên chỉ được chứa chữ cái (không có số/ký tự đặc biệt)",
    };
  }

  return { ok: true, value: normalized };
};

const validatePassword = (value) => {
  if (typeof value !== "string") {
    return { ok: false, message: "Mật khẩu là bắt buộc" };
  }

  if (value.length === 0) {
    return { ok: false, message: "Mật khẩu không được để trống" };
  }

  if (/^\s+$/.test(value)) {
    return { ok: false, message: "Mật khẩu không được toàn khoảng trắng" };
  }

  if (value.length < 8 || value.length > 64) {
    return { ok: false, message: "Mật khẩu phải có độ dài từ 8 đến 64 ký tự" };
  }

  return { ok: true, value };
};

const normalizeEmail = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
};

module.exports = {
  validateFullName,
  validatePassword,
  normalizeEmail,
};
