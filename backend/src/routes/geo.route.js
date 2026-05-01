const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  geoAutocomplete,
  geoReverse,
} = require("../controllers/geo.controller");

const router = express.Router();

router.get("/autocomplete", requireAuth, geoAutocomplete);
router.get("/reverse", requireAuth, geoReverse);

module.exports = router;
