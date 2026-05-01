const { autocompleteAddress, reverseGeocode } = require("../services/geo/nominatim.service");

// Gợi ý địa chỉ khi nhập
const geoAutocomplete = async (req, res, next) => {
  try {
    const items = await autocompleteAddress({ input: req.query?.input });
    return res.json({ items });
  } catch (err) {
    return next(err);
  }
};

// Chuyển đổi tọa độ thành địa chỉ (ví dụ khi dùng định vị GPS)
const geoReverse = async (req, res, next) => {
  try {
    const lat = Number(req.query?.lat);
    const lon = Number(req.query?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ message: "Thiếu hoặc sai lat/lon" });
    }

    const item = await reverseGeocode({ lat, lon });
    return res.json({ item });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  geoAutocomplete,
  geoReverse,
};

