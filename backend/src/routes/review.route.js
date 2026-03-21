const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const {
  createReview,
  listReviewsByProduct,
  getLatestReviews,
} = require("../controllers/review.controller");

const router = express.Router();

router.get("/latest", getLatestReviews);
router.get("/product/:productId", listReviewsByProduct);
router.post("/", requireAuth, upload.array("images", 4), createReview);

module.exports = router;
