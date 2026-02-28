const mongoose = require("mongoose");
const Review = require("../models/Review.model");
const Order = require("../models/Order.model");
const Product = require("../models/Product.model");
const { uploadBuffer } = require("../services/cloudinary.service");
const { validateReviewContent } = require("../utils/reviewValidation");

const parsePositiveInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
};

const mapLimit = async (arr, limit, mapper) => {
  const list = Array.isArray(arr) ? arr : [];
  const size = list.length;
  if (size === 0) return [];

  const concurrency = Math.max(1, Math.min(Number(limit) || 1, size));
  const results = new Array(size);
  let nextIndex = 0;

  const workers = Array.from({ length: concurrency }).map(async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= size) break;
      results[current] = await mapper(list[current], current);
    }
  });

  await Promise.all(workers);
  return results;
};

const pickReview = (r) => {
  return {
    id: r._id,
    productId: r.productId,
    orderId: r.orderId,
    user: r.userId
      ? {
          id: r.userId._id || r.userId,
          fullName: r.userId.fullName,
        }
      : null,
    rating: Number(r.rating || 0),
    content: r.content || "",
    images: (r.images || []).map((img) => ({
      url: img.url,
      publicId: img.publicId,
      width: Number(img.width || 0),
      height: Number(img.height || 0),
    })),
    createdAt: r.createdAt,
  };
};

const recomputeProductRating = async (productId) => {
  const agg = await Review.aggregate([
    {
      $match: {
        productId: new mongoose.Types.ObjectId(productId),
        isActive: true,
      },
    },
    // Ensure unique-per-user aggregation, in case historical data had duplicates
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$userId",
        rating: { $first: "$rating" },
      },
    },
    {
      $group: {
        _id: null,
        avg: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const avg = agg?.[0]?.avg ? Number(agg[0].avg) : 0;
  const count = agg?.[0]?.count ? Number(agg[0].count) : 0;

  const safeAvg = Math.max(0, Math.min(5, Number.isFinite(avg) ? avg : 0));
  const safeCount = Math.max(0, Number.isFinite(count) ? count : 0);

  await Product.updateOne(
    { _id: productId },
    {
      $set: {
        ratingAvg: safeAvg,
        ratingCount: safeCount,
      },
    },
  );

  return { ratingAvg: safeAvg, ratingCount: safeCount };
};

const createReview = async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ message: "Vui lòng đăng nhập" });

    const orderId =
      typeof req.body?.orderId === "string" ? req.body.orderId.trim() : "";
    const productId =
      typeof req.body?.productId === "string" ? req.body.productId.trim() : "";
    const ratingRaw = req.body?.rating;
    const rating = Number.parseInt(ratingRaw, 10);
    const contentRaw =
      typeof req.body?.content === "string" ? req.body.content : "";

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ message: "Thiếu hoặc sai orderId" });
    }
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Thiếu hoặc sai productId" });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating không hợp lệ" });
    }

    const validated = validateReviewContent(contentRaw);
    if (!validated.ok) {
      return res
        .status(400)
        .json({ message: validated.message || "Nội dung không hợp lệ" });
    }

    const order = await Order.findOne({ _id: orderId, userId }).select(
      "status items",
    );
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }
    if (order.status !== "completed") {
      return res
        .status(400)
        .json({ message: "Chỉ có thể đánh giá khi đơn đã hoàn thành" });
    }

    const hasItem = (order.items || []).some(
      (it) => String(it.productId) === String(productId),
    );
    if (!hasItem) {
      return res
        .status(400)
        .json({ message: "Sản phẩm không thuộc đơn hàng này" });
    }

    const exists = await Review.findOne({ userId, productId }).select("_id");
    if (exists) {
      return res
        .status(409)
        .json({ message: "Bạn đã đánh giá sản phẩm này rồi" });
    }

    const productExists =
      await Product.findById(productId).select("_id isActive");
    if (!productExists || !productExists.isActive) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const limited = files.slice(0, 4);
    const folder = `furniture/reviews/${productId}`;
    const prefix = `o_${orderId}_u_${userId}_${Date.now()}`;

    const uploaded = await mapLimit(limited, 3, (f, i) =>
      uploadBuffer({
        buffer: f.buffer,
        folder,
        publicId: `${prefix}_${i + 1}`,
      }),
    );

    const review = await Review.create({
      userId,
      productId,
      orderId,
      rating,
      content: validated.value,
      images: uploaded.filter(Boolean).map((r) => ({
        url: r.secure_url,
        publicId: r.public_id,
        width: r.width || 0,
        height: r.height || 0,
      })),
    });

    const summary = await recomputeProductRating(productId);
    const populated = await Review.findById(review._id).populate(
      "userId",
      "fullName",
    );

    return res.status(201).json({
      message: "Đánh giá thành công",
      review: pickReview(populated),
      rating: summary,
    });
  } catch (err) {
    return next(err);
  }
};

const listReviewsByProduct = async (req, res, next) => {
  try {
    const productId = req.params?.productId;
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "productId không hợp lệ" });
    }

    const page = parsePositiveInt(req.query?.page, 1);
    const limit = Math.min(parsePositiveInt(req.query?.limit, 8), 20);
    const skip = (page - 1) * limit;

    const filter = { productId, isActive: true };
    const [total, items] = await Promise.all([
      Review.countDocuments(filter),
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "fullName"),
    ]);

    return res.json({
      items: items.map(pickReview),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { createReview, listReviewsByProduct };
