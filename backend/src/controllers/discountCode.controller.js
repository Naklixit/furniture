const DiscountCode = require("../models/DiscountCode.model");
const mongoose = require("mongoose");

const { parsePositiveInt, parseNonNegativeNumber } = require("../utils/validators");
const { normalizeCode } = require("../utils/regex");

// Simple utility for safe property checking
const hasOwn = (obj, key) =>
  Object.prototype.hasOwnProperty.call(obj || {}, key);

const parseDateInput = (value, mode) => {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? value : null;
  }

  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day)
    )
      return null;
    if (mode === "end") return new Date(year, month - 1, day, 23, 59, 59, 999);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  const d = new Date(s);
  const t = d.getTime();
  if (!Number.isFinite(t)) return null;
  return d;
};

const computeDiscountTotals = ({ orderSubtotal, percentOff }) => {
  const pct = Number(percentOff || 0);
  const subtotal = Number(orderSubtotal || 0);
  const discountAmount = Math.max(0, Math.round((subtotal * pct) / 100));
  const finalTotal = Math.max(0, Math.round(subtotal - discountAmount));
  return { discountAmount, finalTotal };
};

const getDiscountIneligibility = ({
  discountCode,
  userId,
  now,
  orderSubtotal,
}) => {
  if (!discountCode) {
    return { status: 404, message: "Mã giảm giá không tồn tại" };
  }
  if (!discountCode.isActive) {
    return { status: 400, message: "Mã giảm giá đang bị tắt" };
  }
  if (Number(discountCode.remainingUses || 0) <= 0) {
    return { status: 400, message: "Mã giảm giá đã hết lượt sử dụng" };
  }
  if ((discountCode.usedBy || []).some((u) => String(u) === String(userId))) {
    return { status: 400, message: "Bạn đã sử dụng mã giảm giá này rồi" };
  }
  if (
    discountCode.startsAt &&
    now.getTime() < new Date(discountCode.startsAt).getTime()
  ) {
    return { status: 400, message: "Mã giảm giá chưa tới thời gian áp dụng" };
  }
  if (
    discountCode.endsAt &&
    now.getTime() > new Date(discountCode.endsAt).getTime()
  ) {
    return { status: 400, message: "Mã giảm giá đã hết hạn" };
  }
  const minOrderValue = Number(discountCode.minOrderValue || 0);
  if (orderSubtotal < minOrderValue) {
    return {
      status: 400,
      message: `Đơn tối thiểu ${minOrderValue.toLocaleString("vi-VN")}đ để áp mã`,
    };
  }
  return null;
};

const pickDiscountCode = (d) => ({
  id: d._id,
  code: d.code,
  percentOff: Number(d.percentOff || 0),
  minOrderValue: Number(d.minOrderValue || 0),
  remainingUses: Number(d.remainingUses || 0),
  startsAt: d.startsAt,
  endsAt: d.endsAt,
  isActive: Boolean(d.isActive),
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

const validatePayload = (body, { partial = false, current = null } = {}) => {
  const updates = {};

  if (!partial || hasOwn(body, "code")) {
    const code = normalizeCode(body?.code);
    if (!code) return { ok: false, message: "Mã giảm giá là bắt buộc" };
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
      return {
        ok: false,
        message: "Mã giảm giá chỉ gồm A-Z, 0-9, _ hoặc - (3-30 ký tự)",
      };
    }
    updates.code = code;
  }

  if (!partial || hasOwn(body, "percentOff")) {
    const percentOff = Number(body?.percentOff);
    if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) {
      return { ok: false, message: "Giảm giá phải trong khoảng 1-100 (%)" };
    }
    updates.percentOff = Math.round(percentOff);
  }

  if (!partial || hasOwn(body, "minOrderValue")) {
    const minOrderValue = parseNonNegativeNumber(body?.minOrderValue, 0);
    if (minOrderValue === null) {
      return { ok: false, message: "Đơn tối thiểu phải là số >= 0" };
    }
    updates.minOrderValue = minOrderValue;
  }

  if (!partial || hasOwn(body, "remainingUses")) {
    const remainingUses = parseNonNegativeNumber(body?.remainingUses, 0);
    if (remainingUses === null) {
      return { ok: false, message: "Số lượng còn lại phải là số >= 0" };
    }
    updates.remainingUses = Math.round(remainingUses);
  }

  if (!partial || hasOwn(body, "startsAt")) {
    const startsAt = parseDateInput(body?.startsAt, "start");
    updates.startsAt = startsAt;
  }

  if (!partial || hasOwn(body, "endsAt")) {
    const endsAt = parseDateInput(body?.endsAt, "end");
    updates.endsAt = endsAt;
  }

  const finalStartsAt = hasOwn(updates, "startsAt")
    ? updates.startsAt
    : (current?.startsAt ?? null);
  const finalEndsAt = hasOwn(updates, "endsAt")
    ? updates.endsAt
    : (current?.endsAt ?? null);
  if (finalStartsAt && finalEndsAt) {
    const s = new Date(finalStartsAt).getTime();
    const e = new Date(finalEndsAt).getTime();
    if (Number.isFinite(s) && Number.isFinite(e) && s > e) {
      return {
        ok: false,
        message: "Thời gian không hợp lệ (từ ngày phải <= đến ngày)",
      };
    }
  }

  if (!partial || hasOwn(body, "isActive")) {
    if (typeof body?.isActive === "boolean") {
      updates.isActive = body.isActive;
    } else if (!partial) {
      updates.isActive = true;
    }
  }

  return { ok: true, updates };
};

const listAvailableDiscountCodes = async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId)
      return res.status(401).json({ message: "Không có quyền truy cập" });

    const now = new Date();
    const limitRaw = parsePositiveInt(req.query?.limit, 10);
    const limit = Math.min(Math.max(1, limitRaw), 30);

    const userObjectId = new mongoose.Types.ObjectId(String(userId));

    const items = await DiscountCode.aggregate([
      {
        $match: {
          isActive: true,
          remainingUses: { $gt: 0 },
          $and: [
            {
              $or: [
                { startsAt: null },
                { startsAt: { $exists: false } },
                { startsAt: { $lte: now } },
              ],
            },
            {
              $or: [
                { endsAt: null },
                { endsAt: { $exists: false } },
                { endsAt: { $gte: now } },
              ],
            },
          ],
        },
      },
      {
        $addFields: {
          isUsedByMe: { $in: [userObjectId, "$usedBy"] },
          hasEndsAt: {
            $cond: [{ $ifNull: ["$endsAt", false] }, 1, 0],
          },
        },
      },
      {
        $project: {
          _id: 0,
          id: "$_id",
          code: 1,
          percentOff: 1,
          minOrderValue: 1,
          remainingUses: 1,
          startsAt: 1,
          endsAt: 1,
          isUsedByMe: 1,
        },
      },
      {
        $sort: {
          isUsedByMe: 1,
          hasEndsAt: -1,
          endsAt: 1,
          percentOff: -1,
          createdAt: -1,
        },
      },
      { $limit: limit },
    ]);

    return res.json({ items });
  } catch (err) {
    return next(err);
  }
};

const listDiscountCodes = async (req, res, next) => {
  try {
    const requestedPage = parsePositiveInt(req.query?.page, 1);
    const limit = Math.min(parsePositiveInt(req.query?.limit, 10), 100);
    const search =
      typeof req.query?.search === "string" ? req.query.search.trim() : "";

    const filter = {};
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ code: rx }];
    }

    const total = await DiscountCode.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(Math.max(1, requestedPage), totalPages);
    const skip = (safePage - 1) * limit;

    const items = await DiscountCode.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      items: items.map(pickDiscountCode),
      meta: { page: safePage, limit, total, totalPages },
    });
  } catch (err) {
    return next(err);
  }
};

const createDiscountCode = async (req, res, next) => {
  try {
    const { ok, message, updates } = validatePayload(req.body, {
      partial: false,
    });
    if (!ok) return res.status(400).json({ message });

    const created = await DiscountCode.create({
      ...updates,
      createdBy: req.auth?.userId || null,
    });

    return res.status(201).json({
      message: "Tạo mã giảm giá thành công",
      discountCode: pickDiscountCode(created),
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: "Mã giảm giá đã tồn tại" });
    }
    return next(err);
  }
};

const updateDiscountCode = async (req, res, next) => {
  try {
    const id = req.params?.id;
    if (!id) return res.status(400).json({ message: "Thiếu id" });

    const found = await DiscountCode.findById(id);
    if (!found)
      return res.status(404).json({ message: "Không tìm thấy mã giảm giá" });

    const { ok, message, updates } = validatePayload(req.body, {
      partial: true,
      current: found,
    });
    if (!ok) return res.status(400).json({ message });
    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ message: "Không có trường hợp lệ để cập nhật" });
    }

    Object.assign(found, updates);
    await found.save();

    return res.json({
      message: "Cập nhật mã giảm giá thành công",
      discountCode: pickDiscountCode(found),
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: "Mã giảm giá đã tồn tại" });
    }
    return next(err);
  }
};

const deleteDiscountCode = async (req, res, next) => {
  try {
    const id = req.params?.id;
    if (!id) return res.status(400).json({ message: "Thiếu id" });

    const removed = await DiscountCode.findByIdAndDelete(id);
    if (!removed)
      return res.status(404).json({ message: "Không tìm thấy mã giảm giá" });

    return res.json({ message: "Xoá mã giảm giá thành công" });
  } catch (err) {
    return next(err);
  }
};

const applyDiscountCode = async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId)
      return res.status(401).json({ message: "Vui lòng đăng nhập để áp mã" });

    const code = normalizeCode(req.body?.code);
    if (!code)
      return res.status(400).json({ message: "Vui lòng nhập mã giảm giá" });

    const orderSubtotal = parseNonNegativeNumber(req.body?.orderSubtotal, null);
    if (orderSubtotal === null) {
      return res.status(400).json({ message: "Tổng đơn hàng không hợp lệ" });
    }

    const now = new Date();

    const updated = await DiscountCode.findOneAndUpdate(
      {
        code,
        isActive: true,
        remainingUses: { $gt: 0 },
        usedBy: { $ne: userId },
        $and: [
          {
            $or: [{ startsAt: null }, { startsAt: { $lte: now } }],
          },
          {
            $or: [{ endsAt: null }, { endsAt: { $gte: now } }],
          },
          {
            $or: [
              { minOrderValue: { $lte: orderSubtotal } },
              { minOrderValue: { $exists: false } },
            ],
          },
        ],
      },
      { $inc: { remainingUses: -1 }, $addToSet: { usedBy: userId } },
      { new: true },
    );

    if (!updated) {
      const exists = await DiscountCode.findOne({ code });
      const fail = getDiscountIneligibility({
        discountCode: exists,
        userId,
        now,
        orderSubtotal,
      });
      if (fail) return res.status(fail.status).json({ message: fail.message });
      return res.status(400).json({ message: "Không thể áp dụng mã giảm giá" });
    }

    const percentOff = Number(updated.percentOff || 0);
    const { discountAmount, finalTotal } = computeDiscountTotals({
      orderSubtotal,
      percentOff,
    });

    return res.json({
      message: "Áp mã giảm giá thành công",
      applied: {
        code: updated.code,
        percentOff,
        minOrderValue: Number(updated.minOrderValue || 0),
        remainingUses: Number(updated.remainingUses || 0),
        startsAt: updated.startsAt,
        endsAt: updated.endsAt,
        orderSubtotal,
        discountAmount,
        finalTotal,
      },
    });
  } catch (err) {
    return next(err);
  }
};

const validateDiscountCode = async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId)
      return res.status(401).json({ message: "Vui lòng đăng nhập để áp mã" });

    const code = normalizeCode(req.body?.code);
    if (!code)
      return res.status(400).json({ message: "Vui lòng nhập mã giảm giá" });

    const orderSubtotal = parseNonNegativeNumber(req.body?.orderSubtotal, null);
    if (orderSubtotal === null) {
      return res.status(400).json({ message: "Tổng đơn hàng không hợp lệ" });
    }

    const now = new Date();

    const exists = await DiscountCode.findOne({ code });
    const fail = getDiscountIneligibility({
      discountCode: exists,
      userId,
      now,
      orderSubtotal,
    });
    if (fail) return res.status(fail.status).json({ message: fail.message });

    const minOrderValue = Number(exists.minOrderValue || 0);
    const percentOff = Number(exists.percentOff || 0);
    const { discountAmount, finalTotal } = computeDiscountTotals({
      orderSubtotal,
      percentOff,
    });

    return res.json({
      message: "Mã giảm giá hợp lệ",
      applied: {
        code: exists.code,
        percentOff,
        minOrderValue,
        remainingUses: Number(exists.remainingUses || 0),
        startsAt: exists.startsAt,
        endsAt: exists.endsAt,
        orderSubtotal,
        discountAmount,
        finalTotal,
      },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  listDiscountCodes,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  applyDiscountCode,
  validateDiscountCode,
  listAvailableDiscountCodes,
};
