const express = require("express");
const router = express.Router();

const { requireAdmin, optionalAuth } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const {
  listProducts,
  getProductById,
  getProductBySlug,
  getSimilarProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  setProductImages,
} = require("../controllers/product.controller");

router.get("/", optionalAuth, listProducts);
router.get("/by-slug/:slug", optionalAuth, getProductBySlug);
router.get("/by-slug/:slug/similar", optionalAuth, getSimilarProducts);
router.get("/:id", optionalAuth, getProductById);

router.post("/", requireAdmin, createProduct);
router.patch("/:id", requireAdmin, updateProduct);
router.delete("/:id", requireAdmin, deleteProduct);

router.post(
  "/:id/images",
  requireAdmin,
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "galleryImages", maxCount: 12 },
  ]),
  setProductImages,
);

module.exports = router;
