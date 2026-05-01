const { normalizeForMatch } = require("./badWords");

const normalizeText = (value) => {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
};

const foldText = (value) => {
  const t = normalizeText(value);
  if (!t) return "";
  try {
    return t
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/đ/g, "d");
  } catch {
    return t.replace(/đ/g, "d");
  }
};

const formatVnd = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "0đ";
  try {
    return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";
  } catch {
    return `${Math.round(n)}đ`;
  }
};

const computePricing = ({ originalPrice, salePrice }) => {
  const original = Number(originalPrice || 0);
  const sale = Number(salePrice || 0);
  const onSale = sale > 0 && original > 0 && sale < original;
  const effectivePrice = onSale
    ? sale
    : original > 0
      ? original
      : sale > 0
        ? sale
        : 0;
  const discountPercent =
    onSale && original > 0
      ? Math.max(0, Math.min(100, Math.round((1 - sale / original) * 100)))
      : 0;
  return { original, sale, onSale, effectivePrice, discountPercent };
};

const parseMoneyToVnd = (numText, unit) => {
  const raw = String(numText || "")
    .replace(/\s+/g, "")
    .replace(/,/g, ".");
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  const u = String(unit || "").toLowerCase();
  if (u === "trieu" || u === "tr" || u === "m")
    return Math.round(n * 1_000_000);
  if (u === "nghin" || u === "ngan" || u === "k") return Math.round(n * 1_000);
  return Math.round(n);
};

const parsePriceConstraintsFromMessage = (message) => {
  const raw = normalizeText(message);
  const folded = foldText(message);
  if (!raw && !folded)
    return { minPrice: null, maxPrice: null, hasConstraint: false };

  const t = folded || raw;

  const range1 = t.match(
    /\b(tu|từ)\s+(\d+(?:[.,]\d+)?)\s*(trieu|triệu|tr|m|nghin|nghìn|ngan|ngàn|k)?\s+(?:den|đến|toi|tới)\s+(\d+(?:[.,]\d+)?)\s*(trieu|triệu|tr|m|nghin|nghìn|ngan|ngàn|k)?\b/i,
  );
  if (range1) {
    const a = parseMoneyToVnd(range1[2], foldText(range1[3] || "trieu"));
    const b = parseMoneyToVnd(
      range1[4],
      foldText(range1[5] || range1[3] || "trieu"),
    );
    if (a && b) {
      return {
        minPrice: Math.min(a, b),
        maxPrice: Math.max(a, b),
        hasConstraint: true,
      };
    }
  }

  const range2 = t.match(
    /(\d+(?:[.,]\d+)?)\s*(trieu|triệu|tr|m)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*(trieu|triệu|tr|m)\b/i,
  );
  if (range2) {
    const a = parseMoneyToVnd(range2[1], foldText(range2[2]));
    const b = parseMoneyToVnd(range2[3], foldText(range2[4]));
    if (a && b) {
      return {
        minPrice: Math.min(a, b),
        maxPrice: Math.max(a, b),
        hasConstraint: true,
      };
    }
  }

  const mentions = [];
  const millionRx = /(\d+(?:[.,]\d+)?)\s*(trieu|tr|m)\b/gi;
  const thousandRx = /(\d+(?:[.,]\d+)?)\s*(nghin|ngan|k)\b/gi;
  const vndRx = /(\d{1,3}(?:[.,]\d{3}){1,})\s*(?:vnd|dong|d|đ)?\b/gi;

  for (const m of String(folded || "").matchAll(millionRx)) {
    const v = parseMoneyToVnd(m[1], m[2]);
    if (v) mentions.push(v);
  }
  for (const m of String(folded || "").matchAll(thousandRx)) {
    const v = parseMoneyToVnd(m[1], m[2]);
    if (v) mentions.push(v);
  }
  for (const m of String(raw || "").matchAll(vndRx)) {
    const rawNum = String(m[1] || "").replace(/[.,]/g, "");
    const v = Number.parseInt(rawNum, 10);
    if (Number.isFinite(v) && v > 10_000) mentions.push(v);
  }

  if (!mentions.length) {
    return { minPrice: null, maxPrice: null, hasConstraint: false };
  }

  const minMention = Math.min(...mentions);
  const maxMention = Math.max(...mentions);

  const hasTroXuong = /tro\s*xuong/i.test(t);
  const hasTroLen = /tro\s*len/i.test(t);
  const hasUnder =
    /\b(duoi|toi\s*da|khong\s*qua|max|<=|nho\s*hon)\b/i.test(t) || hasTroXuong;
  const hasFromNumber = /\btu\s*\d/i.test(t) && !hasTroXuong;
  const hasOver =
    /\b(tren|min|>=|toi\s*thieu|lon\s*hon)\b/i.test(t) ||
    hasTroLen ||
    hasFromNumber;
  const hasApprox = /\b(khoang|tam|xap\s*xi|around|approx)\b/i.test(t);

  let minPrice = null;
  let maxPrice = null;

  if (hasUnder || hasApprox) {
    maxPrice = minMention;
  }
  if (hasOver) {
    minPrice = maxMention;
  }

  if (mentions.length >= 2 && minPrice == null && maxPrice == null) {
    minPrice = minMention;
    maxPrice = maxMention;
  }

  if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
    const tmp = minPrice;
    minPrice = maxPrice;
    maxPrice = tmp;
  }

  return {
    minPrice,
    maxPrice,
    hasConstraint: minPrice != null || maxPrice != null,
  };
};

const parseRatingConstraints = (message) => {
  const t = foldText(message);
  if (!t)
    return { minRating: null, maxRating: null, hasRatingConstraint: false };

  const aboveMatch = t.match(
    /(?:tren|it\s*nhat|toi\s*thieu)\s+(\d+(?:[.,]\d+)?)\s*sao/i,
  );
  if (aboveMatch) {
    const r = parseFloat(aboveMatch[1].replace(",", "."));
    if (r >= 1 && r <= 5)
      return { minRating: r, maxRating: null, hasRatingConstraint: true };
  }

  const upMatch = t.match(
    /(\d+(?:[.,]\d+)?)\s*sao\s*(?:tro\s*len|toi\s*thieu|it\s*nhat)/i,
  );
  if (upMatch) {
    const r = parseFloat(upMatch[1].replace(",", "."));
    if (r >= 1 && r <= 5)
      return { minRating: r, maxRating: null, hasRatingConstraint: true };
  }

  const downMatch = t.match(/(\d+(?:[.,]\d+)?)\s*sao\s*(?:tro\s*xuong)/i);
  if (downMatch) {
    const r = parseFloat(downMatch[1].replace(",", "."));
    if (r >= 1 && r <= 5)
      return { minRating: null, maxRating: r, hasRatingConstraint: true };
  }

  const fromMatch = t.match(/\btu\s+(\d+(?:[.,]\d+)?)\s*sao/i);
  if (fromMatch) {
    const r = parseFloat(fromMatch[1].replace(",", "."));
    if (r >= 1 && r <= 5)
      return { minRating: r, maxRating: null, hasRatingConstraint: true };
  }

  const belowMatch = t.match(/(?:duoi|khong\s*qua)\s+(\d+(?:[.,]\d+)?)\s*sao/i);
  if (belowMatch) {
    const r = parseFloat(belowMatch[1].replace(",", "."));
    if (r >= 1 && r <= 5)
      return { minRating: null, maxRating: r, hasRatingConstraint: true };
  }

  const approxMatch = t.match(
    /(?:khoang|tam|xap\s*xi)\s+(\d+(?:[.,]\d+)?)\s*sao/i,
  );
  if (approxMatch) {
    const r = parseFloat(approxMatch[1].replace(",", "."));
    if (r >= 1 && r <= 5) {
      return {
        minRating: Math.max(1, r - 0.5),
        maxRating: null,
        hasRatingConstraint: true,
      };
    }
  }

  const exactMatch = t.match(/(\d+(?:[.,]\d+)?)\s*sao/);
  if (exactMatch) {
    const r = parseFloat(exactMatch[1].replace(",", "."));
    if (r >= 1 && r <= 5) {
      return {
        minRating: r,
        maxRating: null,
        hasRatingConstraint: true,
      };
    }
  }

  if (
    /\b(danh\s*gia\s*cao|sao\s*cao|rating\s*cao|danh\s*gia\s*tot|review\s*tot)\b/i.test(
      t,
    )
  ) {
    return { minRating: 4, maxRating: null, hasRatingConstraint: true };
  }

  return { minRating: null, maxRating: null, hasRatingConstraint: false };
};

const parseUserConstraints = (message) => {
  const raw = normalizeText(message);
  const t = foldText(message);
  const { minPrice, maxPrice, hasConstraint } =
    parsePriceConstraintsFromMessage(message);
  const { minRating, maxRating, hasRatingConstraint } =
    parseRatingConstraints(message);

  const wantsOnSale =
    /\b(giam\s*gia|khuyen\s*mai|sale|discount|uu\s*dai)\b/.test(t);
  const wantsHighRating =
    hasRatingConstraint ||
    /\b(danh\s*gia|rating|review|sao\s*cao|nhieu\s*sao)\b/.test(t);

  const categoryTokens = [];
  if (/\b(ghe|chair|armchair)\b/.test(t)) categoryTokens.push("ghe");
  if (/\bsofa\b/.test(t)) categoryTokens.push("sofa");
  const tWithoutSellPhrase = t
    .replace(/\bshop\s*co\s*ban\b/gi, " ")
    .replace(/\bco\s*ban\b/gi, " ");
  if (
    /\b(bàn)\b/i.test(raw) ||
    /\btable\b/i.test(t) ||
    /\bban\b/i.test(tWithoutSellPhrase)
  )
    categoryTokens.push("ban");
  if (/\b(giuong|bed)\b/.test(t)) categoryTokens.push("giuong");
  if (/\b(den|lamp|light)\b/.test(t)) categoryTokens.push("den");
  if (/\b(tu\s*quan\s*ao|wardrobe)\b/.test(t)) categoryTokens.push("tuquanao");
  if (
    /\b(tu|cabinet|wardrobe)\b/.test(t) &&
    !categoryTokens.includes("tuquanao")
  )
    categoryTokens.push("tu");
  if (/\b(ke|shelf)\b/.test(t)) categoryTokens.push("ke");

  const materialTokens = [];
  if (/\b(go|wood|wooden|oak|walnut|pine|bamboo|tre)\b/.test(t))
    materialTokens.push("go");
  if (
    /\b(kim\s*loai|metal|sat|inox|thep|steel|nhom|aluminium|aluminum)\b/.test(t)
  )
    materialTokens.push("kimloai");
  if (/\b(da|leather)\b/.test(t)) materialTokens.push("da");
  if (/\b(vai|fabric|ni|linen|cotton)\b/.test(t)) materialTokens.push("vai");
  if (/\b(nhua|plastic|pp|abs)\b/.test(t)) materialTokens.push("nhua");
  if (/\b(kinh|glass)\b/.test(t)) materialTokens.push("kinh");

  return {
    minPrice,
    maxPrice,
    hasPriceConstraint: hasConstraint,
    minRating,
    maxRating,
    hasRatingConstraint,
    wantsOnSale,
    wantsHighRating,
    categoryTokens: Array.from(new Set(categoryTokens)),
    materialTokens: Array.from(new Set(materialTokens)),
    hasMaterialConstraint: materialTokens.length > 0,
  };
};

const withinPrice = (product, { minPrice, maxPrice }) => {
  const prices = [
    Number(product?.effectivePrice || 0),
    Number(product?.originalPrice || 0),
    Number(product?.salePrice || 0),
  ].filter((p) => Number.isFinite(p) && p > 0);

  if (!prices.length) return false;

  if (maxPrice != null && !prices.some((p) => p <= maxPrice)) return false;
  if (minPrice != null && !prices.some((p) => p >= minPrice)) return false;

  return true;
};

const withinRating = (ratingAvg, { minRating, maxRating }) => {
  const r = Number(ratingAvg || 0);
  if (minRating != null && r < minRating) return false;
  if (maxRating != null && r > maxRating) return false;
  return true;
};

const buildProductHaystack = (product) => {
  const dims = product?.specs?.dimensions;
  const unit = dims?.unit || "cm";
  const dimText =
    dims &&
    [dims.length, dims.width, dims.height]
      .map((n) => Number(n || 0))
      .every((n) => Number.isFinite(n) && n > 0)
      ? `${dims.length}x${dims.width}x${dims.height}${unit}`
      : "";

  const weight = product?.specs?.weight;
  const weightText =
    weight && Number(weight.value || 0) > 0
      ? `${weight.value}${weight.unit || "kg"}`
      : "";

  const extra = product?.specs?.extra;
  const extraObj =
    extra && typeof extra === "object"
      ? extra instanceof Map
        ? Object.fromEntries(extra.entries())
        : extra
      : {};
  const extraText = Object.entries(extraObj)
    .slice(0, 30)
    .map(([k, v]) => `${k}:${v}`)
    .join(" ");

  return foldText(
    [
      product?.name,
      product?.slug,
      product?.brand,
      product?.categoryName,
      product?.description,
      dimText,
      weightText,
      extraText,
    ]
      .filter(Boolean)
      .join(" "),
  );
};

const matchesCategoryTokens = (product, tokens) => {
  if (!tokens?.length) return true;
  const hay = buildProductHaystack(product);

  return tokens.some((tok) => {
    if (tok === "ghe") return /\bghe\b|\bchair\b/.test(hay);
    if (tok === "sofa") return /\bsofa\b/.test(hay);
    if (tok === "ban") return /\bban\b|\btable\b/.test(hay);
    if (tok === "giuong") return /\bgiuong\b|\bbed\b/.test(hay);
    if (tok === "den") return /\bden\b|\blamp\b|\blight\b/.test(hay);
    if (tok === "tuquanao") return /\btu\s*quan\s*ao\b|\bwardrobe\b/.test(hay);
    if (tok === "tu") return /\btu\b|\bcabinet\b|\bwardrobe\b/.test(hay);
    if (tok === "ke") return /\bke\b|\bshelf\b/.test(hay);
    return hay.includes(tok);
  });
};

const matchesMaterialTokens = (product, tokens) => {
  if (!tokens?.length) return true;
  const hay = buildProductHaystack(product);

  return tokens.some((tok) => {
    if (tok === "go")
      return /\b(go|wood|wooden|oak|walnut|pine|tre|bamboo)\b/i.test(hay);
    if (tok === "kimloai")
      return /\b(kim\s*loai|metal|sat|inox|thep|steel|nhom|aluminium|aluminum)\b/i.test(
        hay,
      );
    if (tok === "da") return /\b(da|leather)\b/i.test(hay);
    if (tok === "vai") return /\b(vai|fabric|ni|linen|cotton)\b/i.test(hay);
    if (tok === "nhua") return /\b(nhua|plastic|pp|abs)\b/i.test(hay);
    if (tok === "kinh") return /\b(kinh|glass)\b/i.test(hay);
    return hay.includes(tok);
  });
};

const detectProductIntent = (message) => {
  const raw = normalizeText(message);
  const t = normalizeForMatch(message);
  if (!raw && !t) return { isProductIntent: false, reason: "empty" };

  if (
    /\b(mua|tim|tim kiem|goi y|tu van|chon|so sanh|nen mua|dat hang|order|gia|bao nhieu|co ban|ship|giao hang)\b/i.test(
      t,
    )
  ) {
    return { isProductIntent: true, reason: "buy-keywords" };
  }

  const tWithoutSellPhrase = t
    .replace(/\bshop\s*co\s*ban\b/gi, " ")
    .replace(/\bco\s*ban\b/gi, " ");
  const banAsTable = /\bban\b/i.test(tWithoutSellPhrase);

  if (
    /\b(ghế|sofa|bàn|giường|đèn|tủ|kệ)\b/i.test(raw) ||
    /\b(sofa|wardrobe|chair|table|bed|lamp|cabinet|shelf)\b/i.test(t) ||
    banAsTable
  ) {
    return { isProductIntent: true, reason: "category-mentioned" };
  }

  if (
    /\b(go|wood|kim loai|metal|sat|inox|nhua|plastic|vai|fabric|ni|leather|da|kich thuoc|size|cm|mm)\b/i.test(
      t,
    )
  ) {
    return { isProductIntent: true, reason: "spec-or-material" };
  }

  if (
    /\b\d{1,3}(?:[.,]\d{3}){1,}\b/.test(t) ||
    /\b\d+(?:[.,]\d+)?\s*(tr|trieu|m|k)\b/.test(t)
  ) {
    return { isProductIntent: true, reason: "price-mentioned" };
  }

  return { isProductIntent: false, reason: "chitchat" };
};

const detectOutOfScopeNonFurnitureRequest = (message) => {
  const raw = normalizeText(message);
  const t = normalizeForMatch(message);
  if (!raw && !t) return { isOutOfScope: false, reason: "empty" };

  const tWithoutSellPhrase = t
    .replace(/\bshop\s*co\s*ban\b/gi, " ")
    .replace(/\bco\s*ban\b/gi, " ");
  const banAsTable = /\bban\b/i.test(tWithoutSellPhrase);

  const mentionsFurniture =
    /\b(ghế|sofa|bàn|giường|đèn|tủ|kệ|nội\s*thất)\b/i.test(raw) ||
    /\b(sofa|wardrobe|chair|table|bed|lamp|cabinet|shelf|noi that|noi\s*that)\b/i.test(
      t,
    ) ||
    banAsTable;
  if (mentionsFurniture) return { isOutOfScope: false, reason: "furniture" };

  if (
    /\b(shop\s*có|có\s*bán|bán)\b/i.test(raw) ||
    /\b(shop\s*co|co\s*ban)\b/i.test(t)
  ) {
    if (
      /\b(không|khong|kh\?|\?)\b/i.test(raw) ||
      /\b(khong|kh\?|\?)\b/i.test(t)
    ) {
      return { isOutOfScope: true, reason: "generic-sell-query" };
    }
  }

  const envRaw = String(process.env.AI_OOS_KEYWORDS || "").trim();
  const envTerms = envRaw
    ? envRaw
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 200)
    : [];
  const baseTerms = [
    "bao cao su",
    "condom",
    "bcs",
    "thuoc",
    "thuoc tay",
    "thuoc tranh thai",
    "vien tranh thai",
    "sung",
    "bia",
    "ruou",
    "thuoc la",
    "cigarette",
  ];
  const terms = [...baseTerms, ...envTerms];

  const matched = terms.find((k) => k && t.includes(k));
  if (!matched) return { isOutOfScope: false, reason: "not-matched" };
  return { isOutOfScope: true, reason: `keyword:${matched}` };
};

const formatDimsShort = (dims) => {
  if (!dims) return "";
  const l = Number(dims.length || 0);
  const w = Number(dims.width || 0);
  const h = Number(dims.height || 0);
  if (![l, w, h].every((n) => Number.isFinite(n) && n > 0)) return "";
  return `${l}×${w}×${h}${String(dims.unit || "cm")}`;
};

const formatProductOneLiner = (p) => {
  if (!p) return "";
  const material = String(p?.specs?.material || "").trim();
  const dimsText = formatDimsShort(p?.specs?.dimensions);
  const price = formatVnd(
    p?.effectivePrice || p?.salePrice || p?.originalPrice,
  );

  const parts = [];
  if (p.categoryName) parts.push(p.categoryName);
  if (material) parts.push(material);
  if (dimsText) parts.push(dimsText);
  parts.push(price);

  return `${p.name}${parts.length ? ` — ${parts.join(" • ")}` : ""}`;
};

const appendProductSnippetsToReply = (reply, products) => {
  const list = Array.isArray(products) ? products : [];
  if (!list.length) return String(reply || "").trim();

  const base = String(reply || "").trim();
  const lines = list
    .slice(0, 5)
    .map((p) => formatProductOneLiner(p))
    .filter(Boolean)
    .map((s) => `- ${s}`)
    .join("\n");

  if (!lines) return base;
  const suffix = `\n\nGợi ý nhanh (tóm tắt):\n${lines}`;
  if (/Gợi ý nhanh\s*\(/i.test(base)) return base;
  return (base ? base + suffix : suffix.trim()).trim();
};

const extractKeywords = (message) => {
  const stop = new Set([
    "tôi",
    "toi",
    "mình",
    "minh",
    "muốn",
    "muon",
    "cần",
    "can",
    "tìm",
    "tim",
    "mua",
    "gợi",
    "y",
    "ý",
    "tu",
    "van",
    "tư",
    "vấn",
    "san",
    "pham",
    "sản",
    "phẩm",
    "noi",
    "that",
    "nội",
    "thất",
    "cho",
    "với",
    "va",
    "và",
    "loại",
    "một",
    "các",
    "nhà",
    "phòng",
    "ngủ",
    "khách",
    "bếp",
  ]);

  return normalizeText(message)
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .filter((t) => !stop.has(t))
    .slice(0, 12);
};

const uniqueById = (items) => {
  const out = [];
  const seen = new Set();
  for (const it of items) {
    const id = String(it?._id || it?.id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(it);
  }
  return out;
};

const pickForAi = (p) => {
  const mainUrl =
    p?.images?.main?.url ||
    (Array.isArray(p?.images?.gallery) ? p.images.gallery[0]?.url : "") ||
    "";

  const pricing = computePricing({
    originalPrice: p.originalPrice,
    salePrice: p.salePrice,
  });

  const extra = p?.specs?.extra;
  const extraObj =
    extra && typeof extra === "object"
      ? extra instanceof Map
        ? Object.fromEntries(extra.entries())
        : extra
      : {};

  const material =
    (
      extra?.get?.("Chất liệu") ||
      extraObj?.["Chất liệu"] ||
      extra?.get?.("chat_lieu") ||
      extraObj?.chat_lieu ||
      extra?.get?.("Material") ||
      extraObj?.Material ||
      extra?.get?.("material") ||
      extraObj?.material ||
      ""
    )?.toString?.() || "";

  const dims = p?.specs?.dimensions || null;
  const weight = p?.specs?.weight || null;

  return {
    id: p._id,
    name: p.name,
    slug: p.slug,
    categoryName: p?.categoryId?.name || "",
    brand: p.brand || "",
    originalPrice: pricing.original,
    salePrice: pricing.sale,
    effectivePrice: pricing.effectivePrice,
    onSale: pricing.onSale,
    discountPercent: pricing.discountPercent,
    stock: Number(p.stock || 0),
    description: String(p.description || ""),
    specs: {
      dimensions: dims
        ? {
            length: Number(dims.length || 0),
            width: Number(dims.width || 0),
            height: Number(dims.height || 0),
            unit: String(dims.unit || "cm"),
          }
        : null,
      weight: weight
        ? {
            value: Number(weight.value || 0),
            unit: String(weight.unit || "kg"),
          }
        : null,
      material: String(material || "").trim(),
      extra: Object.entries(extraObj)
        .slice(0, 12)
        .reduce((acc, [k, v]) => {
          acc[String(k)] = String(v);
          return acc;
        }, {}),
    },
    imageUrl: mainUrl,
    ratingAvg: Number(p.ratingAvg || 0),
    ratingCount: Number(p.ratingCount || 0),
  };
};

const isGroqAvailabilityError = (err) => {
  const status = err?.status || err?.response?.status;
  const groqCode = err?.response?.data?.error?.code;
  const msg = String(err?.message || err?.response?.data?.error?.message || "");
  return (
    status === 401 ||
    status === 403 ||
    status === 408 ||
    status === 409 ||
    status === 429 ||
    (typeof status === "number" && status >= 500) ||
    (status === 400 && /^model_/.test(String(groqCode || ""))) ||
    /quota/i.test(msg) ||
    /rate/i.test(msg) ||
    /too many requests/i.test(msg) ||
    /timed?out/i.test(msg) ||
    /blocked at the project level/i.test(msg) ||
    /decommissioned/i.test(msg) ||
    /no longer supported/i.test(msg)
  );
};

const scoreProduct = ({ product, keywords, constraints }) => {
  const hay = normalizeText(buildProductHaystack(product));
  let score = 0;
  for (const k of keywords) {
    if (!k) continue;
    if (hay.includes(k)) score += 3;
  }
  const inStock = Number(product?.stock || 0) > 0;
  if (inStock) score += 1;

  score += Math.min(3, Number(product?.ratingAvg || 0) / 1.8);
  score += Math.min(1.5, Math.log10(Number(product?.ratingCount || 0) + 1));

  if (constraints?.wantsOnSale && product?.onSale) score += 1.5;

  if (constraints?.hasPriceConstraint) {
    if (withinPrice(product, constraints)) score += 4.0;
    else score -= 10;
  }

  if (constraints?.hasRatingConstraint) {
    if (withinRating(product?.ratingAvg, constraints)) score += 3.0;
    else score -= 10;
  }

  if (constraints?.hasMaterialConstraint) {
    if (matchesMaterialTokens(product, constraints.materialTokens))
      score += 4.0;
    else score -= 12;
  }

  return score;
};

const localFallback = ({ candidateCards, keywords, constraints }) => {
  const sorted = [...candidateCards]
    .map((p) => ({ p, s: scoreProduct({ product: p, keywords, constraints }) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);

  const recommended = sorted.slice(0, 5);
  const reply =
    "Hiện dịch vụ AI đang bận/giới hạn nên mình gợi ý nhanh theo dữ liệu sản phẩm trên website. " +
    "Bạn cho mình biết thêm kích thước/phong cách (gỗ, hiện đại, tối giản...) và ngân sách để mình lọc sát hơn nhé.";

  return { reply, recommended, model: "fallback-local" };
};

const enforceAndFillRecommendations = ({
  chosen,
  pool,
  constraints,
  limit = 5,
}) => {
  const out = [];
  const seen = new Set();

  const accept = (p) => {
    if (!p?.id) return false;
    const id = String(p.id);
    if (seen.has(id)) return false;

    if (constraints?.categoryTokens?.length) {
      if (!matchesCategoryTokens(p, constraints.categoryTokens)) return false;
    }

    if (constraints?.hasMaterialConstraint) {
      if (!matchesMaterialTokens(p, constraints.materialTokens)) return false;
    }
    if (constraints?.wantsOnSale && !p?.onSale) return false;
    if (constraints?.hasPriceConstraint) {
      if (!withinPrice(p, constraints)) return false;
    }
    if (constraints?.hasRatingConstraint) {
      if (!withinRating(p?.ratingAvg, constraints)) return false;
    }

    seen.add(id);
    out.push(p);
    return true;
  };

  for (const p of Array.isArray(chosen) ? chosen : []) {
    if (out.length >= limit) break;
    accept(p);
  }

  if (out.length >= limit) return out;

  const scored = (Array.isArray(pool) ? pool : [])
    .filter((p) => p && p.id)
    .map((p) => ({
      p,
      s: scoreProduct({ product: p, keywords: [], constraints }),
    }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);

  for (const p of scored) {
    if (out.length >= limit) break;
    accept(p);
  }

  return out;
};

// const buildFallbackReplyFromGroqError = (err) => {
//   const code = String(err?.response?.data?.error?.code || "");
//   const msg = String(err?.response?.data?.error?.message || err?.message || "");
//   const modelTried = String(err?.modelTried || "");

//   // if (
//   //   code === "model_permission_blocked_project" ||
//   //   code === "model_permission_blocked_org" ||
//   //   /^model_permission_blocked_/i.test(code) ||
//   //   /blocked at the project level/i.test(msg)
//   // ) {
//   //   return (
//   //     `Model AI trên Groq đang bị chặn theo cấu hình quyền (project/org)${modelTried ? `: ${modelTried}` : ""}. ` +
//   //     "Mình tạm gợi ý theo dữ liệu sản phẩm trên website. Bạn kiểm tra Groq Console > Project Limits rồi thử lại nhé."
//   //   );
//   // }

//   // if (
//   //   code === "model_decommissioned" ||
//   //   /decommissioned|no longer supported/i.test(msg)
//   // ) {
//   //   return (
//   //     "Model AI bạn cấu hình trên Groq đã bị ngừng hỗ trợ (decommissioned). " +
//   //     "Mình tạm gợi ý theo dữ liệu sản phẩm trên website; bạn đổi sang model khác trong Groq Console rồi thử lại nhé."
//   //   );
//   // }

//   // if (
//   //   (err?.status || err?.response?.status) === 429 ||
//   //   /too many requests|rate|quota/i.test(msg)
//   // ) {
//   //   return (
//   //     "Groq đang giới hạn tốc độ/quota nên mình tạm gợi ý theo dữ liệu sản phẩm trên website. " +
//   //     "Bạn thử lại sau ít phút hoặc nâng hạn mức Groq nhé."
//   //   );
//   // }

//   // return (
//   //   "Hiện dịch vụ AI đang gặp lỗi kết nối/cấu hình nên mình tạm gợi ý theo dữ liệu sản phẩm trên website. " +
//   //   "Bạn thử lại giúp mình nhé."
//   // );
// };

module.exports = {
  normalizeText,
  foldText,
  formatVnd,
  computePricing,
  parsePriceConstraintsFromMessage,
  parseRatingConstraints,
  parseUserConstraints,
  withinPrice,
  withinRating,
  buildProductHaystack,
  matchesCategoryTokens,
  matchesMaterialTokens,
  detectProductIntent,
  detectOutOfScopeNonFurnitureRequest,
  appendProductSnippetsToReply,
  extractKeywords,
  uniqueById,
  pickForAi,
  isGroqAvailabilityError,
  localFallback,
  enforceAndFillRecommendations,
};
