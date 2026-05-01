const axios = require("axios");
const { normalizeText } = require("../../utils/orderUtils");

const NOMINATIM_UA = "DoAn/1.0 (localhost)";
const NOMINATIM_TIMEOUT_MS = 8000;

/**
 * Gọi Nominatim để gợi ý địa chỉ khi người dùng nhập.
 * Tách ra service để controller mỏng + dễ thay provider khác về sau.
 */
const autocompleteAddress = async ({ input }) => {
  const q = normalizeText(input);
  if (!q) return [];

  const endpoint = "https://nominatim.openstreetmap.org/search";
  const r = await axios.get(endpoint, {
    params: {
      q,
      format: "jsonv2",
      addressdetails: 1,
      limit: 6,
      countrycodes: "vn",
      "accept-language": "vi",
    },
    timeout: NOMINATIM_TIMEOUT_MS,
    headers: {
      "User-Agent": NOMINATIM_UA,
      Accept: "application/json",
    },
  });

  const results = Array.isArray(r?.data) ? r.data : [];
  return results
    .map((it) => {
      const display =
        typeof it?.display_name === "string" ? it.display_name : "";
      const name = typeof it?.name === "string" ? it.name : "";
      const placeId = it?.place_id ? String(it.place_id) : "";
      const lat = Number(it?.lat);
      const lon = Number(it?.lon);

      const mainText = name || (display ? display.split(",")[0].trim() : "");
      const secondaryText = display
        ? display.split(",").slice(1).join(",").trim()
        : "";

      return {
        placeId,
        description: display,
        mainText,
        secondaryText,
        lat: Number.isFinite(lat) ? lat : null,
        lon: Number.isFinite(lon) ? lon : null,
      };
    })
    .filter((x) => x.placeId && x.description);
};

/**
 * Reverse geocode: chuyển lat/lon thành chuỗi địa chỉ.
 */
const reverseGeocode = async ({ lat, lon }) => {
  const endpoint = "https://nominatim.openstreetmap.org/reverse";
  const r = await axios.get(endpoint, {
    params: {
      lat,
      lon,
      format: "jsonv2",
      addressdetails: 1,
      zoom: 18,
      "accept-language": "vi",
    },
    timeout: NOMINATIM_TIMEOUT_MS,
    headers: {
      "User-Agent": NOMINATIM_UA,
      Accept: "application/json",
    },
  });

  const display =
    typeof r?.data?.display_name === "string" ? r.data.display_name : "";
  const placeId = r?.data?.place_id ? String(r.data.place_id) : "";
  return {
    placeId,
    description: display,
    lat,
    lon,
  };
};

module.exports = {
  autocompleteAddress,
  reverseGeocode,
};

