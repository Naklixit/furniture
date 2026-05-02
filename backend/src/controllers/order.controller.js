const mongoose = require("mongoose");
const axios = require("axios");

const Order = require("../models/Order.model");
const VnpayPending = require("../models/VnpayPending.model");
const MomoPending = require("../models/MomoPending.model");
const DiscountCode = require("../models/DiscountCode.model");

const {
  escapeRegex,
  normalizeCode,
  parsePositiveInt,
  getClientBaseUrl,
  getClientBaseUrlFromRequest,
  getClientBaseUrlFromBody,
  getServerBaseUrl,
  getIpAddress,
} = require("../utils/orderUtils");

const { isDuplicateKeyError } = require("../utils/dbErrors");
const {
  buildOrderSuccessRedirect,
  sanitizeClientBase,
} = require("../utils/redirectUtils");

const {
  adjustInventoryForStatus,
} = require("../services/orderInventory.service");
const { buildOrderFromRequest } = require("../services/orderBuilder.service");
const {
  createPendingWithRetry,
} = require("../services/orders/pendingPayment.service");
const {
  verifyMomoCallbackSignature,
  parseMomoResultCode,
  hmacSha256Hex,
} = require("../services/payments/momo.service");
const {
  buildVnpayPaymentUrl,
  verifyVnpayReturn,
  getVnpayConfigFromEnv,
} = require("../services/payments/vnpay.service");

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
  for (let i = 0; i < 10; i += 1) {
    const code = `A${Math.random().toString(16).slice(2, 7).toUpperCase()}`;
    const fixed = (code + "00000").slice(0, 6);
    const exists = await Order.findOne({ orderCode: fixed }).select("_id");
    if (exists) continue;
    const pendingExists = await VnpayPending.findOne({
      orderCode: fixed,
    }).select("_id");
    if (pendingExists) continue;

    const momoPendingExists = await MomoPending.findOne({
      orderCode: fixed,
    }).select("_id");

    if (!momoPendingExists) return fixed;
  }
  return `A${Date.now().toString(16).slice(-5).toUpperCase()}`;
};

// MoMo/VNPay helper đã được tách ra service để dễ test và tránh lặp cấu hình/signature.

const finalizeMomoSuccessIfNeeded = async ({ pending, callback }) => {
  const momoOrderId = String(callback?.orderId || "").trim();
  if (!pending || !momoOrderId) return { ok: false, reason: "missing_pending" };

  const existingOrder = await Order.findOne({
    "payment.momo.orderId": momoOrderId,
  }).select("_id payment.paidAt");

  if (existingOrder) {
    pending.status = "paid";
    pending.paidAt =
      existingOrder.payment?.paidAt || pending.paidAt || new Date();
    pending.orderId = existingOrder._id;
    pending.momoCallback = callback;
    await pending.save();
    return { ok: true, order: existingOrder, already: true };
  }

  let created = null;
  try {
    created = await Order.create({
      orderCode: pending.orderCode,
      userId: pending.userId,
      customer: pending.customer,
      shipping: pending.shipping,
      items: pending.items,
      subtotal: pending.subtotal,
      shippingFee: pending.shippingFee,
      discount: {
        ...(pending.discount || {}),
        consumed: false,
      },
      total: pending.total,
      payment: {
        method: "MOMO",
        status: "paid",
        paidAt: new Date(),
        momo: {
          orderId: momoOrderId,
          requestId: String(callback?.requestId || "").trim(),
          clientBaseUrl: pending.clientBaseUrl,
          transId: String(callback?.transId || "").trim(),
          resultCode:
            typeof callback?.resultCode === "number"
              ? callback.resultCode
              : Number.isFinite(Number(callback?.resultCode))
                ? Number(callback.resultCode)
                : null,
          message: String(callback?.message || "").trim(),
          payType: String(callback?.payType || "").trim(),
          responseTime: String(callback?.responseTime || "").trim(),
          extraData: String(callback?.extraData || "").trim(),
          rawCallback: callback,
        },
      },
      status: "pending",
      createdBy: pending.userId,
      updatedBy: pending.userId,
    });
  } catch (e) {
    if (!isDuplicateKeyError(e)) throw e;

    const already =
      (await Order.findOne({ "payment.momo.orderId": momoOrderId })) ||
      (await Order.findOne({ orderCode: pending.orderCode }));
    if (!already) throw e;

    pending.status = "paid";
    pending.paidAt = already.payment?.paidAt || new Date();
    pending.orderId = already._id;
    pending.momoCallback = callback;
    await pending.save();

    return { ok: true, order: already, already: true };
  }

  pending.status = "paid";
  pending.paidAt = created.payment?.paidAt || new Date();
  pending.orderId = created._id;
  pending.momoCallback = callback;
  await pending.save();

  await consumeDiscountIfNeeded({ order: created });

  return { ok: true, order: created, already: false };
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
  } catch {}
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

    // Validate config sớm để trả lỗi rõ ràng
    getVnpayConfigFromEnv();

    const returnUrl = `${getServerBaseUrl(req)}/api/orders/vnpay/return`;
    // Tạo bản ghi tạm thời cho giao dịch VNPay (sau này sẽ tạo đơn hàng chính thức khi VNPay callback)
    const pending = await createPendingWithRetry({
      Model: VnpayPending,
      retries: 5,
      buildDoc: async () => {
        const orderCode = await generateOrderCode();
        const txnRef = `${orderCode}_${Date.now()}`;
        const clientBaseUrl =
          getClientBaseUrlFromBody(req) ||
          getClientBaseUrlFromRequest(req) ||
          getClientBaseUrl();
        return {
          txnRef,
          orderCode,
          userId: built.value.userId,
          customer: built.value.customer,
          shipping: built.value.shipping,
          items: built.value.items,
          subtotal: built.value.subtotal,
          shippingFee: built.value.shippingFee,
          discount: built.value.discount,
          total: built.value.total,
          clientBaseUrl,
          status: "pending",
        };
      },
    });
    try {
      const amount = Math.max(0, Math.round(Number(pending.total || 0)));
      const paymentUrl = await buildVnpayPaymentUrl({
        amount,
        ipAddr: getIpAddress(req),
        returnUrl,
        txnRef: pending.txnRef,
        orderInfo: `Thanh toan don hang #${pending.orderCode}`,
      });

      return res.json({
        message: "OK",
        orderCode: pending.orderCode,
        paymentUrl,
      });
      //Else xóa bản ghi trong mongoDB nếu thanh toán lỗi hoặc có lỗi xảy ra trong quá trình tạo URL thanh toán VNPay để tránh rác database.
    } catch (e) {
      await VnpayPending.deleteOne({ _id: pending._id });
      throw e;
    }
  } catch (err) {
    return next(err);
  }
};

const vnpayReturn = async (req, res, next) => {
  try {
    try {
      getVnpayConfigFromEnv();
    } catch {
      return res.status(500).send("Missing VNPay config");
    }

    const verify = await verifyVnpayReturn({ query: req.query });

    const txnRef =
      typeof req.query?.vnp_TxnRef === "string" ? req.query.vnp_TxnRef : "";
    const pending = txnRef ? await VnpayPending.findOne({ txnRef }) : null;
    const existingOrder = txnRef
      ? await Order.findOne({ "payment.vnpay.txnRef": txnRef })
      : null;

    const clientBase =
      sanitizeClientBase(existingOrder?.payment?.vnpay?.clientBaseUrl) ||
      sanitizeClientBase(pending?.clientBaseUrl) ||
      getClientBaseUrl();

    if (existingOrder) {
      const ok = existingOrder.payment?.status === "paid";
      return res.redirect(
        buildOrderSuccessRedirect({
          clientBaseUrl: clientBase,
          ok,
          orderId: existingOrder._id,
        }),
      );
    }

    if (!pending) {
      return res.redirect(
        buildOrderSuccessRedirect({ clientBaseUrl: clientBase, ok: false }),
      );
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

    pending.vnpayReturn = {
      responseCode,
      transactionNo,
      bankCode,
      payDate,
      rawReturn: { ...req.query },
    };

    if (verify?.isSuccess && responseCode === "00") {
      let created = null;
      try {
        created = await Order.create({
          orderCode: pending.orderCode,
          userId: pending.userId,
          customer: pending.customer,
          shipping: pending.shipping,
          items: pending.items,
          subtotal: pending.subtotal,
          shippingFee: pending.shippingFee,
          discount: {
            ...(pending.discount || {}),
            consumed: false,
          },
          total: pending.total,
          payment: {
            method: "VNPAY",
            status: "paid",
            paidAt: new Date(),
            vnpay: {
              txnRef,
              clientBaseUrl: pending.clientBaseUrl,
              responseCode,
              transactionNo,
              bankCode,
              payDate,
              rawReturn: { ...req.query },
            },
          },
          status: "pending",
          createdBy: pending.userId,
          updatedBy: pending.userId,
        });
      } catch (e) {
        if (!isDuplicateKeyError(e)) throw e;

        const already =
          (await Order.findOne({ "payment.vnpay.txnRef": txnRef })) ||
          (await Order.findOne({ orderCode: pending.orderCode }));
        if (!already) throw e;

        pending.status = "paid";
        pending.paidAt = already.payment?.paidAt || new Date();
        pending.orderId = already._id;
        await pending.save();

        return res.redirect(
          buildOrderSuccessRedirect({
            clientBaseUrl: clientBase,
            ok: true,
            orderId: already._id,
          }),
        );
      }

      pending.status = "paid";
      pending.paidAt = created.payment?.paidAt || new Date();
      pending.orderId = created._id;
      await pending.save();

      await consumeDiscountIfNeeded({ order: created });

      return res.redirect(
        buildOrderSuccessRedirect({
          clientBaseUrl: clientBase,
          ok: true,
          orderId: created._id,
        }),
      );
    }

    pending.status = "failed";
    await pending.save();

    return res.redirect(
      buildOrderSuccessRedirect({ clientBaseUrl: clientBase, ok: false }),
    );
  } catch (err) {
    return next(err);
  }
};

const createMomoPayment = async (req, res, next) => {
  try {
    const built = await buildOrderFromRequest({ req, paymentMethod: "MOMO" });
    if (!built.ok)
      return res.status(built.status).json({ message: built.message });

    const partnerCode = String(process.env.MOMO_PARTNER_CODE || "").trim();
    const accessKey = String(process.env.MOMO_ACCESS_KEY || "").trim();
    const secretKey = String(process.env.MOMO_SECRET_KEY || "").trim();
    const endpoint = String(
      process.env.MOMO_ENDPOINT ||
        "https://test-payment.momo.vn/v2/gateway/api/create",
    ).trim();
    const requestType = String(
      process.env.MOMO_REQUEST_TYPE || "captureWallet",
    ).trim();

    const partnerName = String(process.env.MOMO_PARTNER_NAME || "").trim();
    const storeId = String(process.env.MOMO_STORE_ID || "").trim();
    const orderGroupId = String(process.env.MOMO_ORDER_GROUP_ID || "").trim();

    if (!partnerCode || !accessKey || !secretKey) {
      return res.status(500).json({
        message:
          "Thiếu cấu hình MoMo (MOMO_PARTNER_CODE / MOMO_ACCESS_KEY / MOMO_SECRET_KEY)",
      });
    }

    const redirectUrl = `${getServerBaseUrl(req)}/api/orders/momo/return`;
    const ipnUrl = `${getServerBaseUrl(req)}/api/orders/momo/ipn`;

    const pending = await createPendingWithRetry({
      Model: MomoPending,
      retries: 5,
      buildDoc: async () => {
        const orderCode = await generateOrderCode();
        const requestId = `${orderCode}_${Date.now()}`;
        const momoOrderId = requestId;
        const clientBaseUrl =
          getClientBaseUrlFromBody(req) ||
          getClientBaseUrlFromRequest(req) ||
          getClientBaseUrl();
        return {
          momoOrderId,
          requestId,
          orderCode,
          userId: built.value.userId,
          customer: built.value.customer,
          shipping: built.value.shipping,
          items: built.value.items,
          subtotal: built.value.subtotal,
          shippingFee: built.value.shippingFee,
          discount: built.value.discount,
          total: built.value.total,
          clientBaseUrl,
          status: "pending",
        };
      },
    });

    try {
      const amount = Math.max(0, Math.round(Number(pending.total || 0)));
      const orderInfo = `Thanh toan don hang #${pending.orderCode}`;
      const extraData = "";

      const rawSignature =
        `accessKey=${accessKey}` +
        `&amount=${amount}` +
        `&extraData=${extraData}` +
        `&ipnUrl=${ipnUrl}` +
        `&orderId=${pending.momoOrderId}` +
        `&orderInfo=${orderInfo}` +
        `&partnerCode=${partnerCode}` +
        `&redirectUrl=${redirectUrl}` +
        `&requestId=${pending.requestId}` +
        `&requestType=${requestType}`;

      const signature = hmacSha256Hex(secretKey, rawSignature);

      const requestBody = {
        partnerCode,
        accessKey,
        partnerName: partnerName || undefined,
        storeId: storeId || undefined,
        requestId: pending.requestId,
        amount,
        orderId: pending.momoOrderId,
        orderInfo,
        redirectUrl,
        ipnUrl,
        extraData,
        requestType,
        orderGroupId: orderGroupId || undefined,
        signature,
        lang: "vi",
        autoCapture: true,
      };

      const { data } = await axios.post(endpoint, requestBody, {
        headers: { "Content-Type": "application/json" },
        timeout: 20000,
      });

      pending.momoCreate = data;
      await pending.save();

      const resultCode =
        typeof data?.resultCode === "number" ? data.resultCode : null;
      if (resultCode !== 0) {
        pending.status = "failed";
        await pending.save();
        return res.status(400).json({
          message: String(data?.message || "MoMo tạo giao dịch thất bại"),
          resultCode,
        });
      }

      return res.json({
        message: "OK",
        orderCode: pending.orderCode,
        payUrl: data?.payUrl || "",
        qrCodeUrl: data?.qrCodeUrl || "",
        deeplink: data?.deeplink || "",
        deeplinkWebInApp: data?.deeplinkWebInApp || "",
      });
    } catch (e) {
      //Xóa bản ghi trong mongoDB nếu thanh toán lỗi hoặc có lỗi xảy ra trong quá trình tạo URL thanh toán MoMo để tránh rác database.
      await MomoPending.deleteOne({ _id: pending._id });
      throw e;
    }
  } catch (err) {
    return next(err);
  }
};

const momoReturn = async (req, res, next) => {
  try {
    const partnerCode = String(process.env.MOMO_PARTNER_CODE || "").trim();
    const accessKey = String(process.env.MOMO_ACCESS_KEY || "").trim();
    const secretKey = String(process.env.MOMO_SECRET_KEY || "").trim();
    if (!partnerCode || !accessKey || !secretKey) {
      return res.status(500).send("Missing MoMo config");
    }

    const callback = { ...req.query };
    const orderId =
      typeof callback?.orderId === "string" ? callback.orderId.trim() : "";
    const pending = orderId
      ? await MomoPending.findOne({ momoOrderId: orderId })
      : null;

    const existingOrder = orderId
      ? await Order.findOne({ "payment.momo.orderId": orderId })
      : null;

    const clientBase =
      sanitizeClientBase(existingOrder?.payment?.momo?.clientBaseUrl) ||
      sanitizeClientBase(pending?.clientBaseUrl) ||
      getClientBaseUrl();

    if (existingOrder) {
      const ok = existingOrder.payment?.status === "paid";
      return res.redirect(
        buildOrderSuccessRedirect({
          clientBaseUrl: clientBase,
          ok,
          orderId: existingOrder._id,
        }),
      );
    }

    if (!pending) {
      return res.redirect(
        buildOrderSuccessRedirect({ clientBaseUrl: clientBase, ok: false }),
      );
    }

    const verify = verifyMomoCallbackSignature({
      accessKey,
      secretKey,
      body: callback,
    });
    pending.momoCallback = callback;

    const resultCodeNum = parseMomoResultCode(callback?.resultCode);

    if (verify.ok && resultCodeNum === 0) {
      const fin = await finalizeMomoSuccessIfNeeded({ pending, callback });
      const orderIdCreated = fin?.order?._id;
      return res.redirect(
        buildOrderSuccessRedirect({
          clientBaseUrl: clientBase,
          ok: true,
          orderId: orderIdCreated || "",
        }),
      );
    }

    pending.status = "failed";
    await pending.save();
    return res.redirect(
      buildOrderSuccessRedirect({ clientBaseUrl: clientBase, ok: false }),
    );
  } catch (err) {
    return next(err);
  }
};

const momoIpn = async (req, res, next) => {
  try {
    const partnerCode = String(process.env.MOMO_PARTNER_CODE || "").trim();
    const accessKey = String(process.env.MOMO_ACCESS_KEY || "").trim();
    const secretKey = String(process.env.MOMO_SECRET_KEY || "").trim();
    if (!partnerCode || !accessKey || !secretKey) {
      return res.status(500).json({ message: "Missing MoMo config" });
    }

    const callback = req.body || {};
    const orderId =
      typeof callback?.orderId === "string" ? callback.orderId.trim() : "";
    if (!orderId) return res.status(400).json({ message: "Missing orderId" });

    const verify = verifyMomoCallbackSignature({
      accessKey,
      secretKey,
      body: callback,
    });
    const pending = await MomoPending.findOne({ momoOrderId: orderId });

    const resultCodeNum = parseMomoResultCode(callback?.resultCode);

    if (!pending) {
      // Nothing to update but still ack to MoMo
      return res.json({ message: "OK" });
    }

    pending.momoCallback = callback;

    if (verify.ok && resultCodeNum === 0) {
      await finalizeMomoSuccessIfNeeded({ pending, callback });
      return res.json({ message: "OK" });
    }

    pending.status = "failed";
    await pending.save();
    return res.json({ message: "OK" });
  } catch (err) {
    return next(err);
  }
};
//Lấy chi tiết đơn hàng của chính mình
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
//Lấy danh sách đơn hàng của chính mình (có phân trang, lọc trạng thái)
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
module.exports = {
  createOrderCOD,
  createVnpayPayment,
  vnpayReturn,
  createMomoPayment,
  momoReturn,
  momoIpn,
  getMyOrderById,
  listMyOrders,
  cancelMyOrder,
  listOrdersAdmin,
  updateOrderStatusAdmin,
};
