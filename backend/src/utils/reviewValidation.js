const stripDiacritics = (s) => {
  try {
    return String(s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  } catch {
    return String(s);
  }
};

const normalizeSpaces = (s) => {
  if (typeof s !== "string") return "";
  return s.trim().replace(/\s+/g, " ");
};

// Hardcoded bad words list (Vietnamese + English)
const BAD_WORDS = [
  // Vietnamese
  "địt",
  "dit",
  "dịt",
  "đĩ",
  "lồn",
  "lon",
  "l0n",
  "cặc",
  "cak",
  "cac",
  "buồi",
  "buoi",
  "dm",
  "đm",
  "dmm",
  "đmm",
  "dcm",
  "đcm",
  "dkm",
  "đkm",
  "vl",
  "vãi",
  "vai lon",
  "cc",
  "clgt",
  "cmm",
  "ngu",
  "đần",
  "khốn",
  "mẹ mày",
  "me may",
  "má mày",
  "ma may",
  "thằng ngu",
  "thang ngu",
  "con ngu",
  "đồ ngu",
  "do ngu",
  "đồ chó",
  "do cho",
  // English
  "fuck",
  "fck",
  "fuk",
  "shit",
  "sh1t",
  "bitch",
  "b1tch",
  "asshole",
  "porn",
  "p0rn",
  "dick",
  "d1ck",
  "pussy",
  "wtf",
  "stfu",
];

const getBannedTerms = () => {
  const envRaw = String(process.env.REVIEW_BANNED_TERMS || "").trim();
  const envTerms = envRaw
    ? envRaw
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 200)
    : [];
  return [...BAD_WORDS, ...envTerms];
};

const looksLikeSpamOrContactInfo = (text) => {
  const t = String(text || "");
  if (!t) return false;

  // URLs
  if (/https?:\/\//i.test(t) || /\bwww\./i.test(t)) return true;
  // Emails
  if (/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/i.test(t)) return true;
  // VN phone numbers (10 digits, usually start with 0)
  if (/\b0\d{9}\b/.test(t)) return true;
  // Social/contact keywords
  if (/\b(zalo|facebook|fb|telegram|tiktok|instagram|ig)\b/i.test(t))
    return true;
  return false;
};

const containsBadWords = (text) => {
  const lower = String(text || "").toLowerCase();
  const plain = stripDiacritics(lower);
  const compact = plain.replace(/[^a-z0-9\s]+/g, "").replace(/\s+/g, " ");

  const banned = getBannedTerms();
  for (const term of banned) {
    const t = term.toLowerCase();
    if (!t) continue;
    const tp = stripDiacritics(t);
    // Word boundary-ish match to reduce false positives on short terms
    const rxSrc = `(^|\\W)${tp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\W|$)`;
    try {
      const rx = new RegExp(rxSrc, "i");
      if (rx.test(lower) || rx.test(plain) || rx.test(compact)) return true;
    } catch {
      // Fallback: simple includes
      if (lower.includes(t) || plain.includes(tp) || compact.includes(tp))
        return true;
    }
  }
  return false;
};

const validateReviewContent = (content) => {
  const cleaned = normalizeSpaces(content);
  if (!cleaned)
    return { ok: false, message: "Vui lòng nhập nội dung đánh giá" };
  if (cleaned.length > 2000)
    return {
      ok: false,
      message: "Nội dung đánh giá quá dài (tối đa 2000 ký tự)",
    };

  if (looksLikeSpamOrContactInfo(cleaned)) {
    return {
      ok: false,
      message:
        "Nội dung đánh giá không hợp lệ (không được chứa link/thông tin liên hệ)",
    };
  }

  // Too many repeated characters (e.g. "aaaaaa" / "!!!!!")
  if (/(.)\1{6,}/.test(cleaned)) {
    return { ok: false, message: "Nội dung đánh giá không hợp lệ" };
  }

  if (containsBadWords(cleaned)) {
    return {
      ok: false,
      message:
        "Nội dung đánh giá chứa từ ngữ không phù hợp. Vui lòng sử dụng ngôn từ lịch sự.",
    };
  }

  return { ok: true, value: cleaned };
};

module.exports = { validateReviewContent, containsBadWords };
