const stripDiacritics = (s) => {
  try {
    return String(s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  } catch {
    return String(s);
  }
};

const normalizeSpaces = (s) => {
  if (typeof s !== "string") return "";
  return s.trim().replace(/\s+/g, " ");
};

const getBannedTerms = () => {
  const raw = String(process.env.REVIEW_BANNED_TERMS || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 200);
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

const validateReviewContent = (content) => {
  const cleaned = normalizeSpaces(content);
  if (!cleaned)
    return { ok: false, message: "Vui lòng nhập nội dung đánh giá" };
  if (cleaned.length < 10)
    return { ok: false, message: "Nội dung đánh giá quá ngắn" };
  if (cleaned.length > 600)
    return { ok: false, message: "Nội dung đánh giá quá dài" };

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

  const letters = cleaned.replace(/[^\p{L}]/gu, "");
  if (letters.length < 8) {
    return { ok: false, message: "Vui lòng viết đánh giá rõ ràng hơn" };
  }

  const banned = getBannedTerms();
  if (banned.length) {
    const lower = cleaned.toLowerCase();
    const plain = stripDiacritics(lower);
    const compact = plain.replace(/[^a-z0-9]+/g, " ");
    for (const term of banned) {
      const t = term.toLowerCase();
      if (!t) continue;
      const tp = stripDiacritics(t);
      if (lower.includes(t) || plain.includes(tp) || compact.includes(tp)) {
        return { ok: false, message: "Nội dung đánh giá không phù hợp" };
      }
    }
  }

  return { ok: true, value: cleaned };
};

module.exports = { validateReviewContent };
