// Helper build URL redirect về client.
// Tách riêng để tránh lặp logic ở VNPay/MoMo return.

const sanitizeClientBase = (baseUrl) => {
  const s = String(baseUrl || "").trim();
  return s ? s.replace(/\/$/, "") : "";
};

const buildOrderSuccessRedirect = ({ clientBaseUrl, ok, orderId }) => {
  const base = sanitizeClientBase(clientBaseUrl);
  const id = orderId ? String(orderId) : "";
  const q = ok
    ? `result=success${id ? `&orderId=${encodeURIComponent(id)}` : ""}`
    : `result=fail${id ? `&orderId=${encodeURIComponent(id)}` : ""}`;
  return `${base}/order/success?${q}`;
};

module.exports = {
  sanitizeClientBase,
  buildOrderSuccessRedirect,
};

