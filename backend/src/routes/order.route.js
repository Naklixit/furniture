const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const {
  createOrderCOD,
  createVnpayPayment,
  vnpayReturn,
  getMyOrderById,
  listMyOrders,
  cancelMyOrder,
  listOrdersAdmin,
  updateOrderStatusAdmin,
} = require("../controllers/order.controller");

const router = express.Router();

// Customer
router.post("/", requireAuth, createOrderCOD);
router.post("/vnpay/create", requireAuth, createVnpayPayment);
router.get("/vnpay/return", vnpayReturn);

// Admin
router.get("/admin/list", requireAdmin, listOrdersAdmin);
router.patch("/admin/:id/status", requireAdmin, updateOrderStatusAdmin);

// Customer
router.get("/my/list", requireAuth, listMyOrders);
router.patch("/:id/cancel", requireAuth, cancelMyOrder);
router.get("/:id", requireAuth, getMyOrderById);

module.exports = router;
