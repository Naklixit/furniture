/**
 * Shared regex and text processing utilities
 * Centralizes duplicated regex/string logic from controllers
 */

/**
 * Escape special regex characters
 * @param {any} value - Value to escape
 * @returns {string} Escaped string safe for regex
 */
const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Normalize whitespace in text
 * @param {string} value - Text to normalize
 * @returns {string} Normalized text with single spaces
 */
const normalizeName = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
};

/**
 * Build exact-match regex for normalized names
 * Matches with flexible whitespace
 * @param {string} normalizedName - Pre-normalized name
 * @returns {RegExp} Case-insensitive exact match regex
 */
const buildNameExactRegex = (normalizedName) => {
  const escaped = escapeRegex(normalizedName);
  const wsLoose = escaped.replace(/ /g, "\\s+");
  return new RegExp(`^${wsLoose}$`, "i");
};

/**
 * Build case-insensitive search regex
 * @param {string} searchTerm - Search term
 * @returns {RegExp} Case-insensitive regex
 */
const buildSearchRegex = (searchTerm) => {
  const escaped = escapeRegex(searchTerm);
  return new RegExp(escaped, "i");
};

/**
 * Normalize code string (uppercase, remove spaces)
 * Useful for discount codes, order codes, etc.
 * @param {string} code - Code to normalize
 * @returns {string} Normalized code
 */
const normalizeCode = (code) => {
  if (typeof code !== "string") return "";
  return code.trim().toUpperCase().replace(/\s+/g, "");
};

module.exports = {
  escapeRegex,
  normalizeName,
  buildNameExactRegex,
  buildSearchRegex,
  normalizeCode,
};
