const axios = require("axios");

// Model chính được ưu tiên để sử dụng cho Groq API
const MODEL_FALLBACK = "llama-3.3-70b-versatile";

// Danh sách các model dự phòng nếu model chính bị lỗi (quá tải, không khả dụng)
// Nếu model chính không chạy được, API sẽ thử lần lượt các model trong danh sách này
const FALLBACK_MODELS = [
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
  "llama3-70b-8192",
  "llama3-8b-8192",
  "qwen/qwen3-32b",
  "groq/compound-mini",
  "groq/compound",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
];

const SYSTEM_INSTRUCTION = `Bạn là nhân viên bán hàng AI phân nội thất của website. Hành động tự nhiên, thân thiện, linh hoạt.

QUY TẮC BẮT BUỘC:
- Chỉ tư vấn sản phẩm có trong danh sách được cung cấp. Không bịa ra sản phẩm ngoài danh sách.
- Chỉ tư vấn nội thất: ghế, sofa, bàn, giường, đèn, tủ, kệ v.v.
- Nếu hỏi ngoài phạm vi: từ chối nhẹ nhàng, gợi ý mô tả nhu cầu nội thất.
- Tiếng Việt, tự nhiên, không máy móc, không lặp lại.
- Tôn trọng nếu người dùng dùng từ không phù hợp; từ chối lịch sự.

CHI TIẾT TƯ VẤN:
- Giải thích tại sao sản phẩm phù hợp (giá hợp lý, chất liệu tốt, đánh giá cao, kiểu dáng v.v)
- Khi gợi ý, kể câu chuyện nhỏ: "Sản phẩm này được khách hàng rất yêu thích vì..."
- Nếu người dùng không có yêu cầu cụ thể, hỏi thêm để hiểu rõ nhu cầu thay vì gợi ý ngay
- Hỏi về không gian sử dụng, phong cách yêu thích, size, budget để gợi ý chính xác

ĐẦU RA:
- Luôn trả về đúng JSON, không kèm markdown, không kèm giải thích.`;

const tryParseJson = (text) => {
  if (typeof text !== "string") return null;
  const raw = text.trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
};

const createGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const err = new Error("Thiếu GROQ_API_KEY trong môi trường");
    err.statusCode = 500;
    throw err;
  }

  const baseURL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
  return { apiKey, baseURL };
};

const groqSingleton = (() => {
  let cached = null;
  return () => {
    if (!cached) cached = createGroqClient();
    return cached;
  };
})();

/**
 * @param {{ message: string, candidates: Array<{ idx:number, id:string, name:string, slug:string, categoryName?:string, originalPrice?:number, salePrice?:number, effectivePrice?:number, onSale?:boolean, discountPercent?:number, stock?:number, brand?:string, description?:string, ratingAvg?:number, ratingCount?:number, specs?: { dimensions?: { length?:number,width?:number,height?:number,unit?:string }|null, weight?: { value?:number,unit?:string }|null, material?: string, extra?: Record<string,string> } }> }} input
 */
const recommendProductsWithGroq = async ({
  message,
  candidates,
  constraints,
  limit = 3,
}) => {
  const { apiKey, baseURL } = groqSingleton();

  const preferred =
    String(process.env.GROQ_MODEL || "").trim() || MODEL_FALLBACK;
  const modelTryList = [preferred, MODEL_FALLBACK, ...FALLBACK_MODELS]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);

  const list = Array.isArray(candidates) ? candidates : [];

  // === CHI TIẾT DÙNG: Biến đổi dữ liệu sản phẩm thành định dạng ngắn gọn cho LLM ===
  // LLM (Groq) cần dữ liệu sản phẩm dưới dạng văn bản, không JSON nested
  // Mỗi sản phẩm sẽ là một dòng chứa: id, tên, giá, chất liệu, kích thước, v.v
  // VD: "#0 idx=1022 name=Ghế gỗ tự nhiên | category=Chair | material=Oak | dimensions=60x70x80cm | effectivePrice=1200000đ"
  const productsText = list
    .map((p) => {
      // Xử lý kích thước: Nếu đủ thông tin => định dạng "dài x rộng x cao cm"
      const dims = p?.specs?.dimensions;
      const dimText =
        dims &&
        [dims.length, dims.width, dims.height]
          .map((n) => Number(n || 0))
          .every((n) => Number.isFinite(n) && n > 0)
          ? `${dims.length}x${dims.width}x${dims.height}${dims.unit || "cm"}`
          : "";

      // Xử lý trọng lượng
      const weight = p?.specs?.weight;
      const weightText =
        weight && Number(weight.value || 0) > 0
          ? `${weight.value}${weight.unit || "kg"}`
          : "";

      // Chất liệu chính
      const material = String(p?.specs?.material || "").trim();

      // Thông tin specs extras (thường chứa chất liệu với tên khác nhau: Material, chat_lieu, Chất liệu)
      const extra =
        p?.specs?.extra && typeof p.specs.extra === "object"
          ? p.specs.extra
          : null;
      const extraText = extra
        ? Object.entries(extra)
            .slice(0, 10)
            .map(([k, v]) => `${k}:${String(v).slice(0, 30)}`)
            .join(", ")
        : "";

      // Xác định giá cuối cùng: Ưu tiên effectivePrice > salePrice > originalPrice
      const effective = Number(p.effectivePrice || 0);
      const original = Number(p.originalPrice || 0);
      const sale = Number(p.salePrice || 0);
      const price =
        Number.isFinite(effective) && effective > 0
          ? effective
          : Number(sale || 0) > 0
            ? sale
            : original;

      // Lắp ráp dòng sản phẩm: Mỗi field được cách nhau bằng " | "
      return [
        `#${p.idx}`,
        `id=${p.id}`,
        `slug=${p.slug}`,
        `name=${p.name}`,
        p.categoryName ? `category=${p.categoryName}` : null,
        p.brand ? `brand=${p.brand}` : null,
        material ? `material=${material}` : null,
        dimText ? `dimensions=${dimText}` : null,
        weightText ? `weight=${weightText}` : null,
        extraText ? `specsExtra=${extraText}` : null,
        Number.isFinite(original) && original > 0
          ? `originalPrice=${original}`
          : null,
        Number.isFinite(sale) && sale > 0 ? `salePrice=${sale}` : null,
        typeof p.onSale === "boolean" ? `onSale=${p.onSale}` : null,
        Number.isFinite(Number(p.discountPercent)) &&
        Number(p.discountPercent) > 0
          ? `discountPercent=${Number(p.discountPercent)}`
          : null,
        Number.isFinite(price) && price > 0 ? `effectivePrice=${price}` : null,
        Number.isFinite(Number(p.stock)) ? `stock=${Number(p.stock)}` : null,
        Number.isFinite(Number(p.ratingAvg))
          ? `ratingAvg=${Number(p.ratingAvg)}`
          : null,
        Number.isFinite(Number(p.ratingCount))
          ? `ratingCount=${Number(p.ratingCount)}`
          : null,
        p.description ? `desc=${String(p.description).slice(0, 160)}` : null,
      ]
        .filter(Boolean)
        .join(" | ");
    })
    .join("\n");

  let constraintBlock = "";
  //Constraints rất tốt, nhưng thiếu sự validate giữa các keyword có thể giống nhau
  //VD: Từ, khoảng, tối thiếu,...
  if (constraints) {
    const cParts = [];
    if (constraints.maxPrice != null) {
      const op = constraints.maxPriceExclusive ? "<" : "<=";
      cParts.push(
        `- Người dùng yêu cầu giá DƯỚI ${constraints.maxPrice.toLocaleString("vi-VN")}đ. BẮT BUỘC chỉ chọn sản phẩm có effectivePrice ${op} ${constraints.maxPrice}. Tuyệt đối KHÔNG chọn sản phẩm vượt ngân sách.`,
      );
    }
    if (constraints.minPrice != null) {
      const op = constraints.minPriceExclusive ? ">" : ">=";
      cParts.push(
        `- Người dùng yêu cầu giá TỪ ${constraints.minPrice.toLocaleString("vi-VN")}đ trở lên. BẮT BUỘC chỉ chọn sản phẩm có effectivePrice ${op} ${constraints.minPrice}.`,
      );
    }
    if (constraints.minRating != null) {
      cParts.push(
        `- Người dùng yêu cầu đánh giá TỪ ${constraints.minRating} sao trở lên. BẮT BUỘC chỉ chọn sản phẩm có ratingAvg >= ${constraints.minRating}.`,
      );
    }
    if (constraints.maxRating != null) {
      cParts.push(
        `- Người dùng yêu cầu đánh giá DƯỚI ${constraints.maxRating} sao. BẮT BUỘC chỉ chọn sản phẩm có ratingAvg <= ${constraints.maxRating}.`,
      );
    }
    if (constraints.wantsOnSale) {
      cParts.push(
        "- Người dùng muốn sản phẩm đang GIẢM GIÁ (onSale=true). Ưu tiên sản phẩm có discountPercent cao.",
      );
    }
    if (cParts.length) {
      constraintBlock = `\n\nRÀNG BUỘC BẮT BUỘC (vi phạm = sai):\n${cParts.join("\n")}`;
    }
  }

  const userPrompt = `Yêu cầu người dùng: """${String(message || "").trim()}"""

Danh sách sản phẩm (chỉ được chọn trong đây):
${productsText || "(trống)"}

Hãy trả về JSON đúng schema sau:
{
  "reply": string,
  "productIndexes": number[]
}

HƯỚNG DẪN:
- productIndexes chỉ chứa các số #idx từ danh sách (tối đa ${Math.max(
    1,
    Math.min(5, Number(limit || 3)),
  )} sản phẩm tối ưu nhất). Nếu không đủ sản phẩm phù hợp, có thể trả về ít hơn.
- Nếu người dùng yêu cầu giá cụ thể: chỉ chọn sản phẩm trong ngân sách (KHÔNG chọn ngoài).
- Nếu yêu cầu đánh giá cao: ưu tiên ratingAvg cao.
- Reply: Không máy móc, tự nhiên, giải thích tại sao sản phẩm phù hợp.
- Nếu không tìm được: hỏi thêm vài chi tiết (phong cách, size, dùng cho phòng nào?) để gợi ý tốt hơn.
- Nếu ngoài phạm vi: từ chối nhẹ nhàng, gợi ý mô tả nhu cầu nội thất.${constraintBlock}`;

  const url = `${baseURL.replace(/\/$/, "")}/chat/completions`;

  const basePayload = {
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 700,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: userPrompt },
    ],
  };

  const isModelBlockedOrMissing = (err) => {
    const status = err?.response?.status;
    const code = err?.response?.data?.error?.code;
    const type = err?.response?.data?.error?.type;
    const msg = String(
      err?.response?.data?.error?.message || err?.message || "",
    );
    return (
      status === 404 ||
      (status === 400 &&
        [
          "model_decommissioned",
          "model_not_found",
          "invalid_model",
          "invalid_request_error",
        ].includes(String(code || ""))) ||
      (typeof code === "string" &&
        code.startsWith("model_permission_blocked_")) ||
      type === "permissions_error" ||
      /blocked at the project level/i.test(msg) ||
      /blocked/i.test(msg) ||
      /decommissioned/i.test(msg) ||
      /no longer supported/i.test(msg) ||
      /not found/i.test(msg) ||
      /not supported/i.test(msg)
    );
  };

  const isResponseFormatUnsupported = (err) => {
    const status = err?.response?.status;
    const msg = String(
      err?.response?.data?.error?.message || err?.message || "",
    );
    return status === 400 && /response_format/i.test(msg);
  };

  let lastErr = null;
  let text = "";
  let modelUsed = "";

  for (const model of modelTryList) {
    try {
      const payload = { ...basePayload, model };
      let res;
      try {
        res = await axios.post(url, payload, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        });
      } catch (err) {
        if (isResponseFormatUnsupported(err)) {
          const noFormat = { ...payload };
          delete noFormat.response_format;
          res = await axios.post(url, noFormat, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 30000,
          });
        } else {
          throw err;
        }
      }

      text = String(res?.data?.choices?.[0]?.message?.content || "");
      modelUsed = model;
      lastErr = null;
      break;
    } catch (err) {
      try {
        err.modelTried = model;
        err.attemptedModels = modelTryList;
      } catch {
      }
      lastErr = err;
      if (isModelBlockedOrMissing(err)) {
        continue;
      }
      throw err;
    }
  }

  if (lastErr) {
    try {
      lastErr.attemptedModels = modelTryList;
    } catch {
    }
    throw lastErr;
  }

  const parsed = tryParseJson(text);

  const reply = String(parsed?.reply || "").trim();
  const productIndexes = Array.isArray(parsed?.productIndexes)
    ? parsed.productIndexes
        .map((n) => Number.parseInt(n, 10))
        .filter((n) => Number.isFinite(n))
    : [];

  return {
    reply:
      reply ||
      "Mình có thể giúp bạn chọn sản phẩm nội thất phù hợp. Bạn đang cần loại nào và kích thước/giá mong muốn ra sao?",
    productIndexes,
    rawText: text,
    modelUsed,
  };
};

module.exports = {
  recommendProductsWithGroq,
  MODEL_FALLBACK,
};
