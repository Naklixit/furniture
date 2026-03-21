const fs = require("fs");
const path = require("path");

const DEFAULT_WORDS_PATH = path.join(
  __dirname,
  "..",
  "data",
  "vn_offensive_words.txt",
);

const stripDiacritics = (s) => {
  try {
    return String(s)
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/đ/gi, "d");
  } catch {
    return String(s).replace(/đ/gi, "d");
  }
};

const normalizeForMatch = (s) => {
  const lower = String(s || "").toLowerCase();
  const plain = stripDiacritics(lower);
  // Keep spaces so we can do boundary-ish regex.
  return plain
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeKeepDiacritics = (s) => {
  const lower = String(s || "").toLowerCase();
  try {
    return lower
      .replace(/[^\p{L}\p{N}\s]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    // Fallback without Unicode property escapes.
    return lower
      .replace(/[^0-9a-zA-Z\s]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
};

// Some folded (no-diacritics) tokens collide heavily with common Vietnamese words.
// Example: "các" -> "cac" but "cac" is also used as profanity when unaccented.
// To prevent widespread false-positives, ignore these as standalone single-word terms.
const AMBIGUOUS_SINGLE_WORD_FOLDED = new Set([
  "cac", // "các"
  "buoi", // "buổi"
  "deo", // "đeo" vs "đéo"
  "sang", // "sáng" is very common
]);

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseTermsFromTxt = (txt) => {
  const lines = String(txt || "").split(/\r?\n/);
  const out = [];

  for (const lineRaw of lines) {
    const line = String(lineRaw || "").trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    if (/^[-]{3,}$/.test(line)) continue;
    if (/^#{3,}$/.test(line)) continue;

    // This file is intended as one-term-per-line.
    // If a line accidentally contains inline comments, strip after '#'.
    const noComment = line.includes("#") ? line.split("#")[0].trim() : line;
    if (!noComment) continue;

    out.push(noComment);
  }

  return out;
};

const badWordsSingleton = (() => {
  let cached = null;

  const build = () => {
    const filePath =
      String(process.env.BAD_WORDS_FILE || "").trim() || DEFAULT_WORDS_PATH;

    let fileTerms = [];
    try {
      const txt = fs.readFileSync(filePath, "utf8");
      fileTerms = parseTermsFromTxt(txt);
    } catch {
      // If file missing/unreadable, just fall back to env list.
      fileTerms = [];
    }

    const envRaw = String(process.env.BAD_WORDS_EXTRA || "").trim();
    const envTerms = envRaw
      ? envRaw
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
          .slice(0, 500)
      : [];
    const seenAccented = new Set();
    const accented = [];

    const seenFolded = new Set();
    const foldedSafe = [];

    for (const t of [...fileTerms, ...envTerms]) {
      const a = normalizeKeepDiacritics(t);
      if (a && a.length >= 2 && !seenAccented.has(a)) {
        seenAccented.add(a);
        accented.push(a);
      }

      const f = normalizeForMatch(t);
      if (!f) continue;
      // Drop 1-char artifacts that can happen with lines like "d'" or "b`".
      if (f.length < 2) continue;
      // Avoid false positives for extremely common Vietnamese words after folding.
      if (!f.includes(" ") && AMBIGUOUS_SINGLE_WORD_FOLDED.has(f)) continue;
      if (seenFolded.has(f)) continue;
      seenFolded.add(f);
      foldedSafe.push(f);
    }

    // Longer terms first reduces short-term false positives.
    accented.sort((a, b) => b.length - a.length);
    foldedSafe.sort((a, b) => b.length - a.length);
    return { accented, foldedSafe };
  };

  return () => {
    if (!cached) cached = build();
    return cached;
  };
})();

const containsBadWords = (text) => {
  const tFolded = normalizeForMatch(text);
  const tAcc = normalizeKeepDiacritics(text);
  if (!tFolded && !tAcc) return false;

  const { accented, foldedSafe } = badWordsSingleton();

  // If input contains diacritics (or 'đ'), prefer diacritics-preserving matching first.
  const hasDiacritics = stripDiacritics(tAcc || "") !== String(tAcc || "");

  if (hasDiacritics && tAcc) {
    for (const term of accented) {
      if (!term) continue;
      // Unicode "boundary-ish": non letter/number separators.
      const rxSrc = `(^|[^\\p{L}\\p{N}])${escapeRegex(term)}([^\\p{L}\\p{N}]|$)`;
      try {
        const rx = new RegExp(rxSrc, "iu");
        if (rx.test(tAcc)) return true;
      } catch {
        if (tAcc.includes(term)) return true;
      }
    }
  }

  // If user input already has diacritics, do NOT run full folded matching.
  // This avoids severe false positives (e.g., "các"->"cac", "sáng"->"sang").
  // We still catch a small set of common shorthand profanity that is usually typed without diacritics.
  if (hasDiacritics && tFolded) {
    if (/(^|\W)(dm+|dcm+)(\W|$)/i.test(tFolded)) return true;
    return false;
  }

  // Folded matching (safe set): catches unaccented profanity when the whole message is unaccented.
  if (tFolded) {
    for (const term of foldedSafe) {
      if (!term) continue;
      const rxSrc = `(^|\\W)${escapeRegex(term)}(\\W|$)`;
      try {
        const rx = new RegExp(rxSrc, "i");
        if (rx.test(tFolded)) return true;
      } catch {
        if (tFolded.includes(term)) return true;
      }
    }
  }

  return false;
};

// Internal helper for debugging false positives in development.
// Returns the first matching term and which matching mode triggered it.
const _debugBadWordsMatch = (text) => {
  const tFolded = normalizeForMatch(text);
  const tAcc = normalizeKeepDiacritics(text);
  if (!tFolded && !tAcc) return null;

  const { accented, foldedSafe } = badWordsSingleton();
  const hasDiacritics = stripDiacritics(tAcc || "") !== String(tAcc || "");

  if (hasDiacritics && tAcc) {
    for (const term of accented) {
      if (!term) continue;
      const rxSrc = `(^|[^\\p{L}\\p{N}])${escapeRegex(term)}([^\\p{L}\\p{N}]|$)`;
      try {
        const rx = new RegExp(rxSrc, "iu");
        if (rx.test(tAcc)) return { mode: "accented", term, rxSrc, tAcc };
      } catch {
        if (tAcc.includes(term)) return { mode: "accented", term, rxSrc, tAcc };
      }
    }
  }

  if (hasDiacritics && tFolded) {
    if (/(^|\W)(dm+|dcm+)(\W|$)/i.test(tFolded)) {
      return { mode: "folded-shorthand", term: "dm/dcm", tFolded };
    }
    return null;
  }

  if (tFolded) {
    for (const term of foldedSafe) {
      if (!term) continue;
      const rxSrc = `(^|\\W)${escapeRegex(term)}(\\W|$)`;
      try {
        const rx = new RegExp(rxSrc, "i");
        if (rx.test(tFolded)) return { mode: "folded", term, rxSrc, tFolded };
      } catch {
        if (tFolded.includes(term))
          return { mode: "folded", term, rxSrc, tFolded };
      }
    }
  }

  return null;
};

module.exports = {
  containsBadWords,
  normalizeForMatch,
  _debugBadWordsMatch,
};
