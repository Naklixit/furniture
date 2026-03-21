const express = require("express");
const router = express.Router();

const { optionalAuth } = require("../middleware/auth");
const { aiChat } = require("../controllers/ai.controller");

router.post("/chat", optionalAuth, aiChat);

module.exports = router;
