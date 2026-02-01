const validateFullName = (value) => {
  if (typeof value !== "string") {
    return { ok: false, message: "Full name is required" };
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: "Full name cannot be blank" };
  }

  // Normalize multiple whitespace to single spaces (and keep no leading/trailing spaces)
  const normalized = trimmed.replace(/\s+/g, " ");

  if (normalized.length < 2 || normalized.length > 50) {
    return { ok: false, message: "Full name must be 2-50 characters" };
  }

  // Allow unicode letters (including Vietnamese) and combining marks, with single spaces between words
  if (!/^[\p{L}\p{M}]+(?: [\p{L}\p{M}]+)*$/u.test(normalized)) {
    return {
      ok: false,
      message: "Full name must contain letters only (no numbers/symbols)",
    };
  }

  return { ok: true, value: normalized };
};

const validatePassword = (value) => {
  if (typeof value !== "string") {
    return { ok: false, message: "Password is required" };
  }

  // Do NOT trim passwords; spaces may be part of it
  if (value.length === 0) {
    return { ok: false, message: "Password cannot be empty" };
  }

  if (/^\s+$/.test(value)) {
    return { ok: false, message: "Password cannot be all spaces" };
  }

  if (value.length < 8 || value.length > 64) {
    return { ok: false, message: "Password must be 8-64 characters" };
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
