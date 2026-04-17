const fs = require("fs");
const path = require("path");

const DEFAULT_WORDS_PATH = path.join(
  __dirname,
  "..",
  "data",
  "vn_offensive_words.txt",
);

// Chuẩn hóa dấu tiếng Việt bằng NFD (Normal Form Decomposed)
// VD: "dấu" -> "d" + "a" + "u" + diacritic, sau đó xóa diacritics
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

// Chuẩn hóa cho khớp chữ: loại bỏ dấu + chuyển thường + loại bỏ ký tự đặc biệt
// Dùng để tìm từ cục với nội dung nhập vào KHÔNG có dấu (VD: "khong", "dang")
const normalizeForMatch = (s) => {
  const lower = String(s || "").toLowerCase();
  const plain = stripDiacritics(lower);
  return plain
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// Chuẩn hóa giữ nguyên dấu: chỉ loại bỏ ký tự đặc biệt, giữ dấu tiếng Việt
// Dùng khi nội dung nhập vào CÓ dấu (VD: "không", "đang") - chính xác hơn
const normalizeKeepDiacritics = (s) => {
  const lower = String(s || "").toLowerCase();
  try {
    return lower
      .replace(/[^\p{L}\p{N}\s]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return lower
      .replace(/[^0-9a-zA-Z\s]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
};

// Các từ thông dụng trong tiếng Việt mà khi loại bỏ dấu có thể trùng với từ nhạy cảm
// VD: "các" (bình thường) -> "cac" (có thể trùng từ xin lỗi). Để tránh báo động sai lệch
// khi nhập vào CÓ dấu, ta bỏ qua chúng trong "folded matching" nhưng vẫn kiểm tra "accented matching"
const AMBIGUOUS_SINGLE_WORD_FOLDED = new Set(["cac", "buoi", "deo", "sang"]);

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

  // Phát hiện xem nhập vào có dấu hay không
  const hasDiacritics = stripDiacritics(tAcc || "") !== String(tAcc || "");

  // GIAI ĐOẠN 1: Nếu nhập vào CÓ dấu (chính xác)
  // => Kiểm tra accented matching trước (chính xác cao hơn)
  if (hasDiacritics && tAcc) {
    for (const term of accented) {
      if (!term) continue;
      // Dùng Unicode word boundary (\p{L}\p{N}) để tránh khớp từ con
      // VD: tìm "chồng" nhưng không khớp trong "chồng bé"
      const rxSrc = `(^|[^\\p{L}\\p{N}])${escapeRegex(term)}([^\\p{L}\\p{N}]|$)`;
      try {
        const rx = new RegExp(rxSrc, "iu");
        if (rx.test(tAcc)) return true;
      } catch {
        if (tAcc.includes(term)) return true;
      }
    }
  }

  // GIAI ĐOẠN 2: Nếu nhập vào CÓ dấu => KHÔNG chạy folded matching
  // Lý do: Tránh báo động sai lệch (VD: "các" bình thường không phải từ nhạy cảm)
  // Chỉ kiểm tra tắt tay "dm/dcm" (slang ruy tiêu)
  if (hasDiacritics && tFolded) {
    if (/(^|\W)(dm+|dcm+)(\W|$)/i.test(tFolded)) return true;
    return false;
  }

  // GIAI ĐOẠN 3: Nếu nhập vào KHÔNG có dấu (đã biến, viết tắt)
  // => Chạy folded matching với tập từ "safe" (loại bỏ những từ thông dụng)
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
