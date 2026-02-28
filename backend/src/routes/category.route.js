const express = require("express");
const router = express.Router();

const { requireAdmin, optionalAuth } = require("../middleware/auth");
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/category.controller");

router.get("/", optionalAuth, listCategories);
router.post("/", requireAdmin, createCategory);
router.patch("/:id", requireAdmin, updateCategory);
router.delete("/:id", requireAdmin, deleteCategory);

module.exports = router;
