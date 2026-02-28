const mongoose = require("mongoose");
const axios = require("axios");

const Order = require("../models/Order.model");
const DiscountCode = require("../models/DiscountCode.model");

const {
  escapeRegex,
  normalizeText,
  normalizeCode,
  parsePositiveInt,
  getClientBaseUrl,
  getClientBaseUrlFromRequest,
  getClientBaseUrlFromBody,
  getServerBaseUrl,
  getIpAddress,
} = require("../utils/orderUtils");

const {
  adjustInventoryForStatus,
} = require("../services/orderInventory.service");
const { buildOrderFromRequest } = require("../services/orderBuilder.service");

const pickOrder = (o) => {
  return {
    id: o._id,
    orderCode: o.orderCode,
    customer: o.customer,
    shipping: o.shipping,
    items: (o.items || []).map((it) => ({
      productId: it.productId,
      slug: it.slug,
      name: it.name,
      imageUrl: it.imageUrl,
      price: Number(it.price || 0),
      qty: Number(it.qty || 0),
      lineTotal: Number(it.lineTotal || 0),
    })),
    subtotal: Number(o.subtotal || 0),
    shippingFee: Number(o.shippingFee || 0),
    discount: {
      code: o.discount?.code || "",
      percentOff: Number(o.discount?.percentOff || 0),
      amount: Number(o.discount?.amount || 0),
    },
    total: Number(o.total || 0),
    payment: {
      method: o.payment?.method,
      status: o.payment?.status,
      paidAt: o.payment?.paidAt,
    },
    status: o.status,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};

const generateOrderCode = async () => {
  // Looks like: A85088 (6 chars)
  for (let i = 0; i < 10; i += 1) {
    const code = `A${Math.random().toString(16).slice(2, 7).toUpperCase()}`;
    // Ensure length 6
    const fixed = (code + "00000").slice(0, 6);
    const exists = await Order.findOne({ orderCode: fixed }).select("_id");
    if (!exists) return fixed;
  }
  return `A${Date.now().toString(16).slice(-5).toUpperCase()}`;
};

const consumeDiscountIfNeeded = async ({ order }) => {
  const code = normalizeCode(order?.discount?.code);
  if (!code) return;
  if (order?.discount?.consumed) return;

  const userId = order?.userId;
  if (!userId) return;

  try {
    const updated = await DiscountCode.findOneAndUpdate(
      {
        code,
        isActive: true,
        remainingUses: { $gt: 0 },
        usedBy: { $ne: userId },
      },
      { $inc: { remainingUses: -1 }, $addToSet: { usedBy: userId } },
      { new: true },
    );

    if (updated) {
      order.discount.consumed = true;
      await order.save();
    }
  } catch {
    // best-effort
  }
};

const createOrderCOD = async (req, res, next) => {
  try {
    const built = await buildOrderFromRequest({ req, paymentMethod: "COD" });
    if (!built.ok)
      return res.status(built.status).json({ message: built.message });

    const orderCode = await generateOrderCode();

    const created = await Order.create({
      orderCode,
      userId: built.value.userId,
      customer: built.value.customer,
      shipping: built.value.shipping,
      items: built.value.items,
      subtotal: built.value.subtotal,
      shippingFee: built.value.shippingFee,
      discount: built.value.discount,
      total: built.value.total,
      payment: {
        method: "COD",
        status: "unpaid",
      },
      status: "pending",
      createdBy: built.value.userId,
      updatedBy: built.value.userId,
    });

    return res.status(201).json({
      message: "Đặt hàng thành công",
      order: pickOrder(created),
    });
  } catch (err) {
    return next(err);
  }
};

const createVnpayPayment = async (req, res, next) => {
  try {
    const built = await buildOrderFromRequest({ req, paymentMethod: "VNPAY" });
    if (!built.ok)
      return res.status(built.status).json({ message: built.message });

    const tmnCode = String(process.env.VNPAY_TMN_CODE || "").trim();
    const secureSecret = String(process.env.VNPAY_SECURE_SECRET || "").trim();
    const vnpayHost = String(
      process.env.VNPAY_HOST || "https://sandbox.vnpayment.vn",
    ).trim();

    if (!tmnCode || !secureSecret) {
      return res.status(500).json({
        message: "Thiếu cấu hình VNPay (VNPAY_TMN_CODE / VNPAY_SECURE_SECRET)",
      });
    }

    const { VNPay, ignoreLogger } = await import("vnpay");

    const vnpay = new VNPay({
      tmnCode,
      secureSecret,
      vnpayHost,
      testMode:
        String(process.env.VNPAY_TEST_MODE || "true").toLowerCase() !== "false",
      hashAlgorithm: "SHA512",
      enableLog: false,
      loggerFn: ignoreLogger,
    });

    const returnUrl = `${getServerBaseUrl(req)}/api/orders/vnpay/return`;

    const orderCode = await generateOrderCode();
    const txnRef = `${orderCode}_${Date.now()}`;

    const clientBaseUrl =
      getClientBaseUrlFromBody(req) ||
      getClientBaseUrlFromRequest(req) ||
      getClientBaseUrl();

    const created = await Order.create({
      orderCode,
      userId: built.value.userId,
      customer: built.value.customer,
      shipping: built.value.shipping,
      items: built.value.items,
      subtotal: built.value.subtotal,
      shippingFee: built.value.shippingFee,
      discount: built.value.discount,
      total: built.value.total,
      payment: {
        method: "VNPAY",
        status: "pending",
        vnpay: { txnRef, clientBaseUrl },
      },
      status: "pending",
      createdBy: built.value.userId,
      updatedBy: built.value.userId,
    });

    try {
      // NOTE: vnpay.buildPaymentUrl() will multiply vnp_Amount by 100 internally.
      // So we pass the amount in VND here.
      const amount = Math.max(0, Math.round(Number(created.total || 0)));

      const paymentUrl = vnpay.buildPaymentUrl({
        vnp_Amount: amount,
        vnp_IpAddr: getIpAddress(req),
        vnp_ReturnUrl: returnUrl,
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: `Thanh toan don hang #${created.orderCode}`,
      });

      return res.json({
        message: "OK",
        orderId: created._id,
        orderCode: created.orderCode,
        paymentUrl,
      });
    } catch (e) {
      await Order.deleteOne({ _id: created._id });
      throw e;
    }
  } catch (err) {
    return next(err);
  }
};

const vnpayReturn = async (req, res, next) => {
  try {
    const tmnCode = String(process.env.VNPAY_TMN_CODE || "").trim();
    const secureSecret = String(process.env.VNPAY_SECURE_SECRET || "").trim();
    const vnpayHost = String(
      process.env.VNPAY_HOST || "https://sandbox.vnpayment.vn",
    ).trim();

    if (!tmnCode || !secureSecret) {
      return res.status(500).send("Missing VNPay config");
    }

    const { VNPay, ignoreLogger } = await import("vnpay");

    const vnpay = new VNPay({
      tmnCode,
      secureSecret,
      vnpayHost,
      testMode:
        String(process.env.VNPAY_TEST_MODE || "true").toLowerCase() !== "false",
      hashAlgorithm: "SHA512",
      enableLog: false,
      loggerFn: ignoreLogger,
    });

    const verify = vnpay.verifyReturnUrl(req.query);

    const txnRef =
      typeof req.query?.vnp_TxnRef === "string" ? req.query.vnp_TxnRef : "";
    const order = txnRef
      ? await Order.findOne({ "payment.vnpay.txnRef": txnRef })
      : null;

    const clientBase =
      (order?.payment?.vnpay?.clientBaseUrl
        ? String(order.payment.vnpay.clientBaseUrl).trim().replace(/\/$/, "")
        : "") || getClientBaseUrl();

    if (!order) {
      return res.redirect(`${clientBase}/order/success?result=fail`);
    }

    const responseCode =
      typeof req.query?.vnp_ResponseCode === "string"
        ? req.query.vnp_ResponseCode
        : "";
    const transactionNo =
      typeof req.query?.vnp_TransactionNo === "string"
        ? req.query.vnp_TransactionNo
        : "";
    const bankCode =
      typeof req.query?.vnp_BankCode === "string" ? req.query.vnp_BankCode : "";
    const payDate =
      typeof req.query?.vnp_PayDate === "string" ? req.query.vnp_PayDate : "";

    order.payment.vnpay = {
      ...(order.payment.vnpay || {}),
      txnRef,
      responseCode,
      transactionNo,
      bankCode,
      payDate,
      rawReturn: { ...req.query },
    };

    if (verify?.isSuccess && responseCode === "00") {
      order.payment.status = "paid";
      order.payment.paidAt = new Date();
      await order.save();

      await consumeDiscountIfNeeded({ order });

      return res.redirect(
        `${clientBase}/order/success?result=success&orderId=${encodeURIComponent(String(order._id))}`,
      );
    }

    order.payment.status = "failed";
    await order.save();

    return res.redirect(
      `${clientBase}/order/success?result=fail&orderId=${encodeURIComponent(String(order._id))}`,
    );
  } catch (err) {
    return next(err);
  }
};

const getMyOrderById = async (req, res, next) => {
  try {
    const id = req.params?.id;
    if (!id) return res.status(400).json({ message: "Thiếu id đơn hàng" });

    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ message: "Vui lòng đăng nhập" });

    const order = await Order.findOne({ _id: id, userId });
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    return res.json({ order: pickOrder(order) });
  } catch (err) {
    return next(err);
  }
};

const listMyOrders = async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ message: "Vui lòng đăng nhập" });

    const requestedPage = parsePositiveInt(req.query?.page, 1);
    const limit = Math.min(parsePositiveInt(req.query?.limit, 10), 50);
    const status =
      typeof req.query?.status === "string" ? req.query.status.trim() : "";

    const filter = { userId };
    if (
      status &&
      ["pending", "shipping", "completed", "cancelled"].includes(status)
    ) {
      filter.status = status;
    }

    const total = await Order.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(Math.max(1, requestedPage), totalPages);
    const skip = (safePage - 1) * limit;

    const items = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      items: items.map(pickOrder),
      meta: { page: safePage, limit, total, totalPages },
    });
  } catch (err) {
    return next(err);
  }
};

const cancelMyOrder = async (req, res, next) => {
  try {
    const id = req.params?.id;
    if (!id) return res.status(400).json({ message: "Thiếu id đơn hàng" });

    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ message: "Vui lòng đăng nhập" });

    const order = await Order.findOne({ _id: id, userId });
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    if (order.status === "cancelled") {
      return res.status(400).json({ message: "Đơn hàng đã được hủy trước đó" });
    }

    if (order.status === "completed") {
      return res
        .status(400)
        .json({ message: "Đơn hàng đã hoàn thành, không thể hủy" });
    }

    // If inventory was adjusted previously for any reason, restore it.
    await adjustInventoryForStatus({ order, nextStatus: "cancelled" });

    order.status = "cancelled";
    order.updatedBy = userId;
    await order.save();

    return res.json({ message: "Đã hủy đơn hàng", order: pickOrder(order) });
  } catch (err) {
    return next(err);
  }
};

const listOrdersAdmin = async (req, res, next) => {
  try {
    const requestedPage = parsePositiveInt(req.query?.page, 1);
    const limit = Math.min(parsePositiveInt(req.query?.limit, 10), 100);
    const search =
      typeof req.query?.search === "string" ? req.query.search.trim() : "";
    const status =
      typeof req.query?.status === "string" ? req.query.status.trim() : "";

    const filter = {};
    if (
      status &&
      ["pending", "shipping", "completed", "cancelled"].includes(status)
    ) {
      filter.status = status;
    }

    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { orderCode: rx },
        { "customer.fullName": rx },
        { "customer.phoneNumber": rx },
        { "shipping.address": rx },
      ];
    }

    const total = await Order.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(Math.max(1, requestedPage), totalPages);
    const skip = (safePage - 1) * limit;

    const items = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      items: items.map(pickOrder),
      meta: { page: safePage, limit, total, totalPages },
    });
  } catch (err) {
    return next(err);
  }
};

const updateOrderStatusAdmin = async (req, res, next) => {
  try {
    const id = req.params?.id;
    if (!id) return res.status(400).json({ message: "Thiếu id đơn hàng" });

    const nextStatus =
      typeof req.body?.status === "string" ? req.body.status.trim() : "";
    const allowed = ["pending", "shipping", "completed", "cancelled"];
    if (!allowed.includes(nextStatus)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    const order = await Order.findById(id);
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    // Best-effort transactional inventory update (falls back if transactions unsupported)
    const actorId = req.auth?.userId || null;
    try {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await adjustInventoryForStatus({ order, nextStatus, session });
          order.status = nextStatus;
          order.updatedBy = actorId;
          await order.save({ session });
        });
      } finally {
        session.endSession();
      }
    } catch (e) {
      const msg = String(e?.message || "");
      const noTxn =
        msg.includes("Transaction numbers are only allowed") ||
        msg.includes("replica set") ||
        msg.includes("mongos");
      if (!noTxn) throw e;

      await adjustInventoryForStatus({ order, nextStatus });
      order.status = nextStatus;
      order.updatedBy = actorId;
      await order.save();
    }

    // Consume discount when COD order is completed
    if (nextStatus === "completed" && order.payment?.method === "COD") {
      await consumeDiscountIfNeeded({ order });
    }

    return res.json({
      message: "Cập nhật trạng thái thành công",
      order: pickOrder(order),
    });
  } catch (err) {
    return next(err);
  }
};

const geoAutocomplete = async (req, res, next) => {
  try {
    const input = normalizeText(req.query?.input);
    if (!input) return res.json({ items: [] });

    // OpenStreetMap Nominatim (no Google Maps API)
    // NOTE: Nominatim has usage policies; keep queries lightweight.
    const endpoint = "https://nominatim.openstreetmap.org/search";
    const r = await axios.get(endpoint, {
      params: {
        q: input,
        format: "jsonv2",
        addressdetails: 1,
        limit: 6,
        countrycodes: "vn",
        "accept-language": "vi",
      },
      timeout: 8000,
      headers: {
        "User-Agent": "DoAn/1.0 (localhost)",
        Accept: "application/json",
      },
    });

    const results = Array.isArray(r?.data) ? r.data : [];
    const items = results
      .map((it) => {
        const display =
          typeof it?.display_name === "string" ? it.display_name : "";
        const name = typeof it?.name === "string" ? it.name : "";
        const placeId = it?.place_id ? String(it.place_id) : "";
        const lat = Number(it?.lat);
        const lon = Number(it?.lon);

        const mainText = name || (display ? display.split(",")[0].trim() : "");
        const secondaryText = display
          ? display.split(",").slice(1).join(",").trim()
          : "";

        return {
          placeId,
          description: display,
          mainText,
          secondaryText,
          lat: Number.isFinite(lat) ? lat : null,
          lon: Number.isFinite(lon) ? lon : null,
        };
      })
      .filter((x) => x.placeId && x.description);

    return res.json({ items });
  } catch (err) {
    return next(err);
  }
};

const geoReverse = async (req, res, next) => {
  try {
    const lat = Number(req.query?.lat);
    const lon = Number(req.query?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ message: "Thiếu hoặc sai lat/lon" });
    }

    const endpoint = "https://nominatim.openstreetmap.org/reverse";
    const r = await axios.get(endpoint, {
      params: {
        lat,
        lon,
        format: "jsonv2",
        addressdetails: 1,
        zoom: 18,
        "accept-language": "vi",
      },
      timeout: 8000,
      headers: {
        "User-Agent": "DoAn/1.0 (localhost)",
        Accept: "application/json",
      },
    });

    const display =
      typeof r?.data?.display_name === "string" ? r.data.display_name : "";
    const placeId = r?.data?.place_id ? String(r.data.place_id) : "";

    return res.json({
      item: {
        placeId,
        description: display,
        lat,
        lon,
      },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createOrderCOD,
  createVnpayPayment,
  vnpayReturn,
  getMyOrderById,
  listMyOrders,
  cancelMyOrder,
  listOrdersAdmin,
  updateOrderStatusAdmin,
  geoAutocomplete,
  geoReverse,
};
