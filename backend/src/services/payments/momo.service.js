const crypto = require("crypto");

const hmacSha256Hex = (secretKey, rawSignature) => {
  return crypto
    .createHmac("sha256", String(secretKey || ""))
    .update(String(rawSignature || ""))
    .digest("hex");
};

/**
 * Verify callback signature của MoMo.
 * MoMo có 2 format: AIO v2 (resultCode) và legacy (errorCode/localMessage).
 * Nếu sai signature thì tuyệt đối không tạo đơn (tránh bị giả mạo callback).
 */
const verifyMomoCallbackSignature = ({ accessKey, secretKey, body }) => {
  const b = body || {};
  const signature = typeof b.signature === "string" ? b.signature : "";

  // AIO v2 format (resultCode)
  const rawSignatureV2 =
    `accessKey=${accessKey}` +
    `&amount=${b.amount ?? ""}` +
    `&extraData=${b.extraData ?? ""}` +
    `&message=${b.message ?? ""}` +
    `&orderId=${b.orderId ?? ""}` +
    `&orderInfo=${b.orderInfo ?? ""}` +
    `&orderType=${b.orderType ?? ""}` +
    `&partnerCode=${b.partnerCode ?? ""}` +
    `&payType=${b.payType ?? ""}` +
    `&requestId=${b.requestId ?? ""}` +
    `&responseTime=${b.responseTime ?? ""}` +
    `&resultCode=${b.resultCode ?? ""}` +
    `&transId=${b.transId ?? ""}`;

  const expectedV2 = hmacSha256Hex(secretKey, rawSignatureV2);
  if (signature && expectedV2 && signature === expectedV2) {
    return {
      ok: true,
      expected: expectedV2,
      signature,
      rawSignature: rawSignatureV2,
      mode: "v2",
    };
  }

  const rawSignatureLegacy =
    `partnerCode=${b.partnerCode ?? ""}` +
    `&accessKey=${accessKey}` +
    `&requestId=${b.requestId ?? ""}` +
    `&amount=${b.amount ?? ""}` +
    `&orderId=${b.orderId ?? ""}` +
    `&orderInfo=${b.orderInfo ?? ""}` +
    `&orderType=${b.orderType ?? ""}` +
    `&transId=${b.transId ?? ""}` +
    `&message=${b.message ?? ""}` +
    `&localMessage=${b.localMessage ?? ""}` +
    `&responseTime=${b.responseTime ?? ""}` +
    `&errorCode=${b.errorCode ?? ""}` +
    `&payType=${b.payType ?? ""}` +
    `&extraData=${b.extraData ?? ""}`;

  const expectedLegacy = hmacSha256Hex(secretKey, rawSignatureLegacy);

  return {
    ok: signature && expectedLegacy && signature === expectedLegacy,
    expected: expectedLegacy,
    signature,
    rawSignature: rawSignatureLegacy,
    mode: "legacy",
  };
};

const parseMomoResultCode = (value) => {
  // MoMo trả resultCode có thể là number hoặc string.
  if (typeof value === "number") return value;
  if (Number.isFinite(Number(value))) return Number(value);
  return null;
};

module.exports = {
  hmacSha256Hex,
  verifyMomoCallbackSignature,
  parseMomoResultCode,
};

