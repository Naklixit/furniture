const Product = require("../models/Product.model");
const { recommendProductsWithGroq } = require("../services/groq.service");
const { containsBadWords } = require("../utils/badWords");
const {
  extractKeywords,
  formatVnd,
  parseUserConstraints,
  detectProductIntent,
  detectOutOfScopeNonFurnitureRequest,
  uniqueById,
  pickForAi,
  matchesCategoryTokens,
  matchesMaterialTokens,
  withinPrice,
  withinRating,
  isGroqAvailabilityError,
  localFallback,
  enforceAndFillRecommendations,
  buildFallbackReplyFromGroqError,
  appendProductSnippetsToReply,
} = require("../utils/aiChatUtils");

const MAX_MESSAGE_LEN = 600;
const MAX_CANDIDATES = 30;

const aiChat = async (req, res, next) => {
  try {
    const messageRaw = req.body?.message;
    const message = String(messageRaw || "").trim();

    if (!message) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng nhập nội dung chat." });
    }
    if (message.length > MAX_MESSAGE_LEN) {
      return res.status(400).json({
        success: false,
        message: `Tin nhắn quá dài (tối đa ${MAX_MESSAGE_LEN} ký tự).`,
      });
    }
    if (containsBadWords(message)) {
      return res.json({
        success: true,
        reply:
          "Mình có thể hỗ trợ tư vấn nội thất tốt hơn nếu mình cùng trao đổi lịch sự nhé. Bạn đang muốn tìm sản phẩm gì (ghế/bàn/sofa/tủ/giường/đèn) và ngân sách khoảng bao nhiêu?",
        model: "moderation",
        products: [],
      });
    }

    const oos = detectOutOfScopeNonFurnitureRequest(message);
    if (oos.isOutOfScope) {
      return res.json({
        success: true,
        reply:
          "Hiện shop của mình chỉ hỗ trợ tư vấn và bán sản phẩm nội thất trên website nên mình không có mặt hàng bạn hỏi. " +
          "Nếu bạn cần tư vấn nội thất, bạn cho mình biết không gian sử dụng, chất liệu mong muốn và ngân sách để mình gợi ý đúng hơn nhé.",
        model: "out-of-scope",
        products: [],
      });
    }

    const intent = detectProductIntent(message);
    if (!intent.isProductIntent) {
      return res.json({
        success: true,
        reply:
          "Mình có thể tư vấn nội thất trên website. Bạn đang cần tìm ghế/bàn/sofa/tủ/giường/đèn cho không gian nào? " +
          "Nếu bạn nói thêm chất liệu, kích thước dự kiến và ngân sách, mình sẽ gợi ý sát nhu cầu hơn.",
        model: "no-product-intent",
        products: [],
      });
    }

    const keywords = extractKeywords(message);
    const constraints = parseUserConstraints(message);
    const debug =
      String(req.query?.debug || "") === "1" ? { constraints, intent } : null;

    // Nếu người dùng chỉ nói chất liệu mà không nói loại sản phẩm => yêu cầu làm rõ
    if (
      !constraints.categoryTokens.length &&
      constraints.hasMaterialConstraint &&
      !constraints.hasPriceConstraint &&
      !constraints.hasRatingConstraint &&
      !constraints.wantsOnSale &&
      keywords.length <= 4
    ) {
      return res.json({
        success: true,
        reply:
          "Mình hiểu bạn đang quan tâm chất liệu (ví dụ gỗ/kim loại/vải/da). Bạn muốn tìm loại nội thất nào (ghế/bàn/sofa/tủ/giường/đèn) và dùng cho phòng nào? " +
          "Nếu có thêm kích thước dự kiến và ngân sách, mình sẽ gợi ý đúng hơn nhé.",
        model: "needs-clarification",
        products: [],
        ...(debug ? { debug } : {}),
      });
    }

    // === 4-STAGE SEARCH PIPELINE: Tìm ra ứng cử viên sản phẩm ===
    // Mục đích: Kết hợp nhiều chiến lược để bao quát tất cả sản phẩm phù hợp
    let candidates = [];

    // STAGE 1: Text search - Tìm kiếm toàn văn bản (mô tả sản phẩm)
    // Sử dụng MongoDB text index có sẵn
    try {
      const textHits = await Product.find({
        isActive: true,
        $text: { $search: message },
      })
        .populate("categoryId", "name slug")
        .sort({ score: { $meta: "textScore" }, ratingAvg: -1, ratingCount: -1 })
        .limit(20);
      candidates = candidates.concat(textHits);
    } catch {}

    // STAGE 2: Keyword-targeted search - Tìm kiếm từ khóa rút trích từ tin nhắn
    // VD: "ghế gỗ hiện đại" -> từ khóa: ["ghế", "gỗ", "hiện", "đại"]
    // Tìm trong tên, slug, thương hiệu, mô tả, v.v
    if (keywords.length) {
      const ors = [];
      for (const k of keywords.slice(0, 8)) {
        const rx = new RegExp(k.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"), "i");
        ors.push(
          { name: rx },
          { slug: rx },
          { brand: rx },
          { description: rx },
          { "specs.extra.material": rx },
          { "specs.extra.chat_lieu": rx },
          { "specs.extra.Chất liệu": rx },
          { "specs.extra.Material": rx },
        );
      }

      const regexHits = await Product.find({
        isActive: true,
        $or: ors,
      })
        .populate("categoryId", "name slug")
        .sort({ ratingAvg: -1, ratingCount: -1, createdAt: -1 })
        .limit(25);

      candidates = candidates.concat(regexHits);
    }

    // STAGE 3: Price-targeted search - Tìm theo ngân sách người dùng
    // Đảm bảo những sản phẩm trong tầm giá luôn nằm trong kho ứng cử viên
    if (constraints.hasPriceConstraint) {
      try {
        const pf = { isActive: true };
        const pOr = [];
        if (constraints.maxPrice != null) {
          pOr.push(
            { originalPrice: { $gt: 0, $lte: constraints.maxPrice } },
            { salePrice: { $gt: 0, $lte: constraints.maxPrice } },
          );
        }
        if (constraints.minPrice != null) {
          pOr.push(
            { originalPrice: { $gte: constraints.minPrice } },
            { salePrice: { $gte: constraints.minPrice } },
          );
        }
        if (pOr.length) pf.$or = pOr;
        const priceHits = await Product.find(pf)
          .populate("categoryId", "name slug")
          .sort({ ratingAvg: -1, ratingCount: -1 })
          .limit(20);
        candidates = candidates.concat(priceHits);
      } catch {
        // ignore
      }
    }

    // STAGE 4: Rating-targeted search - Tìm sản phẩm có đánh giá cao
    // Giúp sực hiện nhu cầu người dùng ("sản phẩm tốt", "đánh giá cao")
    if (constraints.hasRatingConstraint && constraints.minRating != null) {
      try {
        const ratingHits = await Product.find({
          isActive: true,
          ratingAvg: { $gte: constraints.minRating },
        })
          .populate("categoryId", "name slug")
          .sort({ ratingAvg: -1, ratingCount: -1 })
          .limit(20);
        candidates = candidates.concat(ratingHits);
      } catch {
        // ignore
      }
    }

    // STAGE 4b: Material-targeted search - Tìm sản phẩm theo chất liệu
    // VD: "ghế gỗ" => tìm các sản phẩm chứa thông tin chất liệu "gỗ"
    if (constraints.hasMaterialConstraint) {
      try {
        const materialRegexes = [];
        for (const tok of constraints.materialTokens || []) {
          if (tok === "go") {
            materialRegexes.push(
              /(gỗ|go|wood|wooden|oak|walnut|pine|tre|bamboo)/i,
            );
          } else if (tok === "kimloai") {
            materialRegexes.push(
              /(kim\s*loại|kim\s*loai|metal|sắt|sat|inox|thép|thep|steel|nhôm|nhom|aluminium|aluminum)/i,
            );
          } else if (tok === "da") {
            materialRegexes.push(/\b(da|leather)\b/i);
          } else if (tok === "vai") {
            materialRegexes.push(/\b(vải|vai|fabric|nỉ|ni|linen|cotton)\b/i);
          } else if (tok === "nhua") {
            materialRegexes.push(/\b(nhựa|nhua|plastic|pp|abs)\b/i);
          } else if (tok === "kinh") {
            materialRegexes.push(/\b(kính|kinh|glass)\b/i);
          }
        }

        if (materialRegexes.length) {
          const ors = [];
          for (const rx of materialRegexes) {
            ors.push(
              { description: rx },
              { "specs.extra.material": rx },
              { "specs.extra.chat_lieu": rx },
              { "specs.extra.Chất liệu": rx },
              { "specs.extra.Material": rx },
            );
          }

          const materialHits = await Product.find({ isActive: true, $or: ors })
            .populate("categoryId", "name slug")
            .sort({ ratingAvg: -1, ratingCount: -1, createdAt: -1 })
            .limit(20);
          candidates = candidates.concat(materialHits);
        }
      } catch {
        // ignore
      }
    }

    // Loại bỏ trùng lặp sản phẩm từ 4 stage trên (cùng sản phẩm có thể xuất hiện ở nhiều stage)
    candidates = uniqueById(candidates).slice(0, MAX_CANDIDATES);

    // STAGE 5: Fallback - Nếu không tìm được gì => lấy top sản phẩm phổ biến
    // Để giúp API có đủ sản phẩm để AI có thể hỏi người dùng làm rõ hơn
    if (!candidates.length) {
      const fallback = await Product.find({ isActive: true })
        .populate("categoryId", "name slug")
        .sort({ ratingAvg: -1, ratingCount: -1, createdAt: -1 })
        .limit(12);
      candidates = uniqueById(fallback).slice(0, MAX_CANDIDATES);
    }

    const candidateCards = candidates.map(pickForAi);

    // === LỌC CỨNG: Áp dụng constraints khắt khe trước khi gửi cho AI ===
    // Nếu người dùng nói "ghế gỗ giá dưới 2 triệu", ta CHỈ gửi những sản phẩm:
    // - Loại: ghế (category match)
    // - Chất liệu: gỗ (material match)
    // - Giá: < 2 triệu (price match)
    // Không được gửi sản phẩm ngoài những tiêu chí này cho AI
    let constrainedCards = [...candidateCards];
    if (constraints.categoryTokens.length) {
      constrainedCards = constrainedCards.filter((p) =>
        matchesCategoryTokens(p, constraints.categoryTokens),
      );
    }
    if (constraints.hasMaterialConstraint) {
      constrainedCards = constrainedCards.filter((p) =>
        matchesMaterialTokens(p, constraints.materialTokens),
      );
    }
    if (constraints.wantsOnSale) {
      constrainedCards = constrainedCards.filter((p) => p.onSale);
    }
    if (constraints.hasPriceConstraint) {
      constrainedCards = constrainedCards.filter((p) =>
        withinPrice(p, constraints),
      );
    }
    if (constraints.hasRatingConstraint) {
      constrainedCards = constrainedCards.filter((p) =>
        withinRating(p.ratingAvg, constraints),
      );
    }

    // If user set strict constraints but we have zero match, return early (no over-budget items).
    if (
      (constraints.hasPriceConstraint ||
        constraints.wantsOnSale ||
        constraints.hasRatingConstraint ||
        constraints.hasMaterialConstraint ||
        constraints.categoryTokens.length) &&
      constrainedCards.length === 0
    ) {
      const parts = [];
      if (constraints.categoryTokens.length)
        parts.push("đúng loại bạn yêu cầu");
      if (constraints.hasMaterialConstraint)
        parts.push("đúng chất liệu bạn yêu cầu");
      if (constraints.wantsOnSale) parts.push("đang giảm giá");
      if (constraints.hasPriceConstraint) {
        if (constraints.minPrice != null && constraints.maxPrice != null)
          parts.push(
            `trong khoảng ${formatVnd(constraints.minPrice)} - ${formatVnd(
              constraints.maxPrice,
            )}`,
          );
        else if (constraints.maxPrice != null)
          parts.push(`dưới ${formatVnd(constraints.maxPrice)}`);
        else if (constraints.minPrice != null)
          parts.push(`từ ${formatVnd(constraints.minPrice)} trở lên`);
      }
      if (constraints.hasRatingConstraint) {
        if (constraints.minRating != null)
          parts.push(`đánh giá từ ${constraints.minRating} sao trở lên`);
        else if (constraints.maxRating != null)
          parts.push(`đánh giá dưới ${constraints.maxRating} sao`);
      }

      return res.json({
        success: true,
        reply:
          `Hiện mình chưa tìm thấy sản phẩm ${parts.filter(Boolean).join(", ")} trên website. ` +
          "Bạn cho mình thêm 1–2 tiêu chí (chất liệu/kích thước/phong cách) hoặc nới ngân sách một chút để mình lọc sát hơn nhé.",
        model: "rule-filter",
        products: [],
        ...(debug ? { debug } : {}),
      });
    }

    const aiPool = constrainedCards.length ? constrainedCards : candidateCards;
    const aiCandidates = aiPool.map((p, idx) => ({ ...p, idx }));

    let aiRes = null;
    try {
      aiRes = await recommendProductsWithGroq({
        message,
        candidates: aiCandidates,
        constraints,
      });
    } catch (err) {
      if (!isGroqAvailabilityError(err)) throw err;

      try {
        const status = err?.status || err?.response?.status;
        const code = err?.response?.data?.error?.code;
        const attempted = Array.isArray(err?.attemptedModels)
          ? err.attemptedModels
          : [];
        const tried = err?.modelTried;
        console.warn("[AI] Groq unavailable -> fallback-local", {
          status,
          code,
          modelTried: tried,
          attemptedModels: attempted,
        });
      } catch {
        // ignore
      }

      const fb = localFallback({
        message,
        candidateCards: constrainedCards.length
          ? constrainedCards
          : candidateCards,
        keywords,
        constraints,
      });
      fb.reply = buildFallbackReplyFromGroqError(err);
      return res.json({
        success: true,
        reply: appendProductSnippetsToReply(fb.reply, fb.recommended),
        model: fb.model,
        products: fb.recommended,
        ...(debug ? { debug } : {}),
      });
    }

    const chosenIdx = Array.isArray(aiRes.productIndexes)
      ? aiRes.productIndexes
      : [];
    const chosenSet = new Set(
      chosenIdx
        .map((n) => Number.parseInt(n, 10))
        .filter((n) => Number.isFinite(n) && n >= 0 && n < aiCandidates.length),
    );

    const chosenRaw = Array.from(chosenSet)
      .slice(0, 3)
      .map((idx) => aiPool[idx])
      .filter(Boolean);

    const enforced = enforceAndFillRecommendations({
      chosen: chosenRaw,
      pool: aiPool,
      constraints,
      limit: 3,
    });

    const recommended = enforced.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      categoryName: p.categoryName,
      originalPrice: p.originalPrice,
      salePrice: p.salePrice,
      effectivePrice: p.effectivePrice,
      onSale: p.onSale,
      discountPercent: p.discountPercent,
      stock: p.stock,
      imageUrl: p.imageUrl,
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      specs: p.specs,
    }));

    return res.json({
      success: true,
      reply: appendProductSnippetsToReply(aiRes.reply, recommended),
      model: aiRes.modelUsed || "",
      products: recommended,
      ...(debug ? { debug } : {}),
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  aiChat,
};
