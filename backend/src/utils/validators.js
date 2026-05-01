/**
 * Shared validation and parsing utilities
 * Centralizes duplicated validation logic from controllers
 */

/**
 * Parse positive integer from request query/params
 * @param {any} value - Value to parse
 * @param {number} fallback - Fallback value if parsing fails
 * @returns {number} Parsed positive integer or fallback
 */
const parsePositiveInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
};

/**
 * Parse non-negative number
 * @param {any} value - Value to parse
 * @param {number} fallback - Fallback value (default: 0)
 * @returns {number|null} Parsed number or null if invalid
 */
const parseNonNegativeNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
};

/**
 * Validate and normalize full name
 * @param {string} name - Full name to validate
 * @returns {{ok: boolean, value: string, message?: string}}
 */
const validateFullName = (name) => {
  if (typeof name !== "string" || !name.trim()) {
    return { ok: false, message: "Họ tên là bắt buộc" };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 100) {
    return { ok: false, message: "Họ tên phải từ 2-100 ký tự" };
  }
  return { ok: true, value: trimmed };
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {{ok: boolean, value?: string, message?: string}}
 */
const validatePassword = (password) => {
  if (typeof password !== "string" || password.length < 6) {
    return { ok: false, message: "Mật khẩu phải từ 6 ký tự trở lên" };
  }
  return { ok: true, value: password };
};

/**
 * Normalize and validate email
 * @param {string} email - Email to normalize
 * @returns {string|null} Normalized email or null if invalid
 */
const normalizeEmail = (email) => {
  if (typeof email !== "string") return null;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) return null;
  return trimmed;
};

module.exports = {
  parsePositiveInt,
  parseNonNegativeNumber,
  validateFullName,
  validatePassword,
  normalizeEmail,
};
