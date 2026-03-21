const Order = require("../models/Order.model");
const User = require("../models/User.model");
const Review = require("../models/Review.model");

const { parsePositiveInt } = require("../utils/orderUtils");

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;
const TZ = "Asia/Ho_Chi_Minh";

const pctChange = (current, previous) => {
  const c = Number(current || 0);
  const p = Number(previous || 0);
  if (!Number.isFinite(c) || !Number.isFinite(p)) return 0;
  if (p === 0) return c === 0 ? 0 : 100;
  return ((c - p) / p) * 100;
};

const startOfLocalDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfLocalDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const formatYmd = (date) => {
  const d = new Date(date);
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const buildDaySeries = ({ startDate, days, valueByDate }) => {
  const items = [];
  const cursor = startOfLocalDay(startDate);

  for (let i = 0; i < days; i += 1) {
    const key = formatYmd(cursor);
    const existing = valueByDate.get(key) || { revenue: 0, orders: 0 };
    items.push({
      date: key,
      revenue: existing.revenue,
      ordersCompleted: existing.orders,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return items;
};

const normalizeStatusCount = (rows) => {
  const map = new Map(
    (rows || []).map((r) => [String(r._id || ""), Number(r.count || 0)]),
  );
  const ordered = ["pending", "shipping", "completed", "cancelled"];
  return ordered.map((status) => ({ status, count: map.get(status) || 0 }));
};

const computeKpisForRange = async ({ startDate, endDate }) => {
  const matchRange = { createdAt: { $gte: startDate, $lte: endDate } };
  const matchCompletedRange = {
    status: "completed",
    createdAt: { $gte: startDate, $lte: endDate },
  };

  const [completedTotalsRows, productsSoldRows, newCustomers, reviewsCount] =
    await Promise.all([
      Order.aggregate([
        { $match: matchCompletedRange },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$total" },
            completedOrders: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        { $match: matchCompletedRange },
        { $unwind: "$items" },
        { $group: { _id: null, productsSold: { $sum: "$items.qty" } } },
      ]),
      User.countDocuments({
        role: "customer",
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      Review.countDocuments({
        isActive: true,
        createdAt: { $gte: startDate, $lte: endDate },
      }),
    ]);

  const totals = completedTotalsRows?.[0] || {};
  const totalRevenue = Number(totals.totalRevenue || 0);
  const completedOrders = Number(totals.completedOrders || 0);
  const avgOrderValue =
    completedOrders > 0 ? totalRevenue / completedOrders : 0;
  const productsSold = Number(productsSoldRows?.[0]?.productsSold || 0);

  return {
    totalRevenue,
    completedOrders,
    newCustomers: Number(newCustomers || 0),
    productsSold,
    reviewsCount: Number(reviewsCount || 0),
    avgOrderValue,
  };
};

const getDashboardStats = async (req, res, next) => {
  try {
    const daysRaw = parsePositiveInt(req.query?.days, DEFAULT_DAYS);
    const days = Math.min(Math.max(1, daysRaw), MAX_DAYS);

    const now = new Date();
    const endDate = endOfLocalDay(now);
    const startDate = startOfLocalDay(now);
    startDate.setDate(startDate.getDate() - (days - 1));

    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);
    const prevEndDate = new Date(startDate.getTime() - 1);

    const matchRange = { createdAt: { $gte: startDate, $lte: endDate } };
    const matchCompletedRange = {
      status: "completed",
      createdAt: { $gte: startDate, $lte: endDate },
    };

    const revenueByDayPromise = Order.aggregate([
      { $match: matchCompletedRange },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: TZ,
            },
          },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const ordersByStatusPromise = Order.aggregate([
      { $match: matchRange },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const currentKpisPromise = computeKpisForRange({ startDate, endDate });
    const previousKpisPromise = computeKpisForRange({
      startDate: prevStartDate,
      endDate: prevEndDate,
    });

    const categoryDistributionPromise = Order.aggregate([
      { $match: matchCompletedRange },
      { $unwind: "$items" },
      { $group: { _id: "$items.productId", qty: { $sum: "$items.qty" } } },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      { $group: { _id: "$product.categoryId", qty: { $sum: "$qty" } } },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          categoryId: "$_id",
          name: { $ifNull: ["$category.name", "Khác"] },
          qty: 1,
        },
      },
      { $sort: { qty: -1 } },
    ]);

    const topProductsPromise = Order.aggregate([
      { $match: matchCompletedRange },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          qtySold: { $sum: "$items.qty" },
          revenue: { $sum: "$items.lineTotal" },
          name: { $first: "$items.name" },
          slug: { $first: "$items.slug" },
          imageUrl: { $first: "$items.imageUrl" },
        },
      },
      { $sort: { qtySold: -1, revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          productId: "$_id",
          name: { $ifNull: ["$product.name", "$name"] },
          slug: { $ifNull: ["$product.slug", "$slug"] },
          imageUrl: {
            $ifNull: ["$product.images.main.url", "$imageUrl"],
          },
          qtySold: 1,
          revenue: 1,
          ratingAvg: { $ifNull: ["$product.ratingAvg", 0] },
          ratingCount: { $ifNull: ["$product.ratingCount", 0] },
        },
      },
    ]);

    const [
      revenueRows,
      statusRows,
      categoryRows,
      topProductsRows,
      currentKpis,
      previousKpis,
    ] = await Promise.all([
      revenueByDayPromise,
      ordersByStatusPromise,
      categoryDistributionPromise,
      topProductsPromise,
      currentKpisPromise,
      previousKpisPromise,
    ]);

    const kpis = {
      totalRevenue: {
        value: currentKpis.totalRevenue,
        changePct: pctChange(
          currentKpis.totalRevenue,
          previousKpis.totalRevenue,
        ),
      },
      completedOrders: {
        value: currentKpis.completedOrders,
        changePct: pctChange(
          currentKpis.completedOrders,
          previousKpis.completedOrders,
        ),
      },
      newCustomers: {
        value: currentKpis.newCustomers,
        changePct: pctChange(
          currentKpis.newCustomers,
          previousKpis.newCustomers,
        ),
      },
      productsSold: {
        value: currentKpis.productsSold,
        changePct: pctChange(
          currentKpis.productsSold,
          previousKpis.productsSold,
        ),
      },
      reviewsCount: {
        value: currentKpis.reviewsCount,
        changePct: pctChange(
          currentKpis.reviewsCount,
          previousKpis.reviewsCount,
        ),
      },
      avgOrderValue: {
        value: currentKpis.avgOrderValue,
        changePct: pctChange(
          currentKpis.avgOrderValue,
          previousKpis.avgOrderValue,
        ),
      },
    };

    const valueByDate = new Map(
      (revenueRows || []).map((r) => [
        String(r._id),
        { revenue: Number(r.revenue || 0), orders: Number(r.orders || 0) },
      ]),
    );

    const revenueByDay = buildDaySeries({ startDate, days, valueByDate });
    const ordersByStatus = normalizeStatusCount(statusRows);
    const categoryDistribution = (categoryRows || []).map((r) => ({
      categoryId: r.categoryId || null,
      name: String(r.name || ""),
      qty: Number(r.qty || 0),
    }));

    const topProducts = (topProductsRows || []).map((r) => ({
      productId: r.productId || null,
      name: String(r.name || ""),
      slug: String(r.slug || ""),
      imageUrl: String(r.imageUrl || ""),
      qtySold: Number(r.qtySold || 0),
      revenue: Number(r.revenue || 0),
      ratingAvg: Number(r.ratingAvg || 0),
      ratingCount: Number(r.ratingCount || 0),
    }));

    return res.json({
      range: {
        days,
        startDate,
        endDate,
      },
      compare: {
        previousStartDate: prevStartDate,
        previousEndDate: prevEndDate,
      },
      kpis,
      charts: {
        revenueByDay,
        ordersByStatus,
        categoryDistribution,
        topProducts,
      },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getDashboardStats,
};
