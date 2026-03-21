const express = require("express");
const router = express.Router();

const { requireAdmin, requireAuth } = require("../middleware/auth");
const {
  listDiscountCodes,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  applyDiscountCode,
  validateDiscountCode,
  listAvailableDiscountCodes,
} = require("../controllers/discountCode.controller");

// Customer: validate (no consume)
router.post("/validate", requireAuth, validateDiscountCode);

// Customer: apply/redeem (will decrement remainingUses by 1)
router.post("/apply", requireAuth, applyDiscountCode);

// Customer: list available codes for current user
router.get("/available", requireAuth, listAvailableDiscountCodes);

// Admin CRUD
router.get("/", requireAdmin, listDiscountCodes);
router.post("/", requireAdmin, createDiscountCode);
router.patch("/:id", requireAdmin, updateDiscountCode);
router.delete("/:id", requireAdmin, deleteDiscountCode);

module.exports = router;
