const mongoose = require("mongoose");

const Product = require("../models/Product.model");
const DiscountCode = require("../models/DiscountCode.model");

const {
  normalizeText,
  normalizeCode,
  computeSaleFinalPrice,
} = require("../utils/orderUtils");

const buildOrderFromRequest = async ({ req, paymentMethod }) => {
  // === VALIDATION STAGE 1: Kiểm tra người dùng đã đăng nhập ===
  const userId = req.auth?.userId;
  if (!userId) return { ok: false, status: 401, message: "Vui lòng đăng nhập" };

  // === VALIDATION STAGE 2: Lấy & chuẩn hóa thông tin liên hệ ===
  // Hỗ trợ cả tên từ fullName và customerFullName (khác client gửi lên)
  const fullName =
    normalizeText(req.body?.fullName) ||
    normalizeText(req.body?.customerFullName);
  const phoneNumber =
    normalizeText(req.body?.phoneNumber) ||
    normalizeText(req.body?.customerPhoneNumber);
  const address =
    normalizeText(req.body?.address) ||
    normalizeText(req.body?.shippingAddress);
  const note = normalizeText(req.body?.note);

  if (!fullName)
    return { ok: false, status: 400, message: "Họ và tên là bắt buộc" };
  if (!phoneNumber)
    return { ok: false, status: 400, message: "Số điện thoại là bắt buộc" };
  if (!address)
    return { ok: false, status: 400, message: "Địa chỉ giao hàng là bắt buộc" };

  // === VALIDATION STAGE 3: Lấy các item từ giỏ hàng ===
  const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!rawItems.length)
    return { ok: false, status: 400, message: "Giỏ hàng trống" };

  // Chuẩn hóa & validate các item: kiểm tra objectId, số lượng
  const normalizedItems = rawItems
    .map((it) => {
      const productId =
        typeof it?.productId === "string" ? it.productId.trim() : "";
      const qty = Math.max(1, Number(it?.qty || 1));
      if (!mongoose.isValidObjectId(productId) || !Number.isFinite(qty))
        return null;
      return { productId, qty: Math.round(qty) };
    })
    .filter(Boolean);

  // === VALIDATION STAGE 4: Gộp chung các item cùng sản phẩm ===
  // VD: [{ productId: "123", qty: 2 }, { productId: "123", qty: 3 }]
  // => [{ productId: "123", qty: 5 }]
  const consolidatedMap = new Map();
  for (const it of normalizedItems) {
    const id = String(it.productId);
    const qty = Math.max(1, Number(it.qty || 1));
    consolidatedMap.set(id, (consolidatedMap.get(id) || 0) + qty);
  }
  const consolidatedItems = Array.from(consolidatedMap.entries()).map(
    ([productId, qty]) => ({ productId, qty: Math.round(qty) }),
  );

  if (!consolidatedItems.length)
    return { ok: false, status: 400, message: "Giỏ hàng không hợp lệ" };

  // === VALIDATION STAGE 5: Kiểm tra sản phẩm tồn tại & hoạt động ===
  const ids = Array.from(new Set(consolidatedItems.map((i) => i.productId)));
  const products = await Product.find({ _id: { $in: ids }, isActive: true });
  const productById = new Map(products.map((p) => [String(p._id), p]));

  for (const it of consolidatedItems) {
    if (!productById.has(String(it.productId))) {
      return {
        ok: false,
        status: 400,
        message: "Có sản phẩm không tồn tại hoặc đã bị ẩn",
      };
    }
  }

  // === VALIDATION STAGE 6: Kiểm tra tồn kho & tính toán giá ===
  const builtItems = [];
  let subtotal = 0;
  for (const it of consolidatedItems) {
    const p = productById.get(String(it.productId));
    const stock = Math.max(0, Number(p?.stock || 0));
    if (it.qty > stock) {
      return {
        ok: false,
        status: 400,
        message: `Sản phẩm "${p?.name || ""}" không đủ tồn kho`,
      };
    }

    const price = computeSaleFinalPrice(p);
    const lineTotal = Math.max(0, Math.round(price * it.qty));
    subtotal += lineTotal;

    builtItems.push({
      productId: p._id,
      slug: p.slug || "",
      name: p.name || "",
      imageUrl: p.images?.main?.url || "",
      price,
      qty: it.qty,
      lineTotal,
    });
  }

  const shippingFee = 0;

  // === VALIDATION STAGE 7: Xác thực & áp dụng mã giảm giá ===
  const discountCode = normalizeCode(
    req.body?.discountCode || req.body?.discount?.code,
  );
  let discountPercentOff = 0;
  let discountAmount = 0;
  let discountDoc = null;

  if (discountCode) {
    const now = new Date();
    const exists = await DiscountCode.findOne({ code: discountCode });

    // Kiểm tra điều kiện mã giảm giá:
    // 1. Mã đang hoạt động (isActive)
    // 2. Còn lượt sử dụng (remainingUses > 0)
    // 3. Người dùng chưa dùng mã này
    // 4. Mã chưa hết thời hạn (giữa startsAt và endsAt)
    // 5. Đơn hàng đạt giá trị tối thiểu (minOrderValue)
    if (
      exists &&
      exists.isActive &&
      Number(exists.remainingUses || 0) > 0 &&
      !(exists.usedBy || []).some((u) => String(u) === String(userId)) &&
      (!exists.startsAt ||
        now.getTime() >= new Date(exists.startsAt).getTime()) &&
      (!exists.endsAt || now.getTime() <= new Date(exists.endsAt).getTime()) &&
      subtotal >= Number(exists.minOrderValue || 0)
    ) {
      discountDoc = exists;
      discountPercentOff = Math.max(
        0,
        Math.min(100, Number(exists.percentOff || 0)),
      );
      discountAmount = Math.max(
        0,
        Math.round((subtotal * discountPercentOff) / 100),
      );
    }
  }

  const total = Math.max(
    0,
    Math.round(subtotal + shippingFee - discountAmount),
  );

  const userEmail = normalizeText(req.auth?.email || "");

  return {
    ok: true,
    value: {
      userId,
      customer: { fullName, phoneNumber, email: userEmail },
      shipping: { address, note },
      items: builtItems,
      subtotal,
      shippingFee,
      discount: {
        code: discountDoc ? discountDoc.code : "",
        percentOff: discountDoc ? discountPercentOff : 0,
        amount: discountDoc ? discountAmount : 0,
        consumed: false,
      },
      total,
      paymentMethod,
    },
  };
};

module.exports = {
  buildOrderFromRequest,
};
