/**
 * VNPay helper: tạo instance + build url + verify return.
 * Tách riêng để controller gọn và tránh lặp cấu hình.
 */

const getVnpayConfigFromEnv = () => {
  const tmnCode = String(process.env.VNPAY_TMN_CODE || "").trim();
  const secureSecret = String(process.env.VNPAY_SECURE_SECRET || "").trim();
  const vnpayHost = String(
    process.env.VNPAY_HOST || "https://sandbox.vnpayment.vn",
  ).trim();

  const testMode =
    String(process.env.VNPAY_TEST_MODE || "true").toLowerCase() !== "false";

  return { tmnCode, secureSecret, vnpayHost, testMode };
};

const createVnpayClient = async () => {
  const { tmnCode, secureSecret, vnpayHost, testMode } = getVnpayConfigFromEnv();
  if (!tmnCode || !secureSecret) {
    const err = new Error(
      "Thiếu cấu hình VNPay (VNPAY_TMN_CODE / VNPAY_SECURE_SECRET)",
    );
    err.statusCode = 500;
    throw err;
  }

  const { VNPay, ignoreLogger } = await import("vnpay");
  return new VNPay({
    tmnCode,
    secureSecret,
    vnpayHost,
    testMode,
    hashAlgorithm: "SHA512",
    enableLog: false,
    loggerFn: ignoreLogger,
  });
};

const verifyVnpayReturn = async ({ query }) => {
  const vnpay = await createVnpayClient();
  return vnpay.verifyReturnUrl(query);
};

const buildVnpayPaymentUrl = async ({
  amount,
  ipAddr,
  returnUrl,
  txnRef,
  orderInfo,
}) => {
  const vnpay = await createVnpayClient();
  return vnpay.buildPaymentUrl({
    vnp_Amount: amount,
    vnp_IpAddr: ipAddr,
    vnp_ReturnUrl: returnUrl,
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
  });
};

module.exports = {
  getVnpayConfigFromEnv,
  createVnpayClient,
  verifyVnpayReturn,
  buildVnpayPaymentUrl,
};

