const express = require("express");
const { requireAdmin } = require("../middleware/auth");
const { getDashboardStats } = require("../controllers/stats.controller");

const router = express.Router();

router.get("/dashboard", requireAdmin, getDashboardStats);

module.exports = router;
