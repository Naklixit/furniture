const { isDuplicateKeyError } = require("../../utils/dbErrors");

/**
 * Tạo bản ghi pending theo kiểu "best effort" với retry khi bị trùng unique key.
 * Dùng cho VNPay/MoMo để giảm lỗi hiếm khi orderCode/txnRef/requestId bị trùng do race.
 *
 * @param {object} params
 * @param {object} params.Model - Mongoose model (VnpayPending/MomoPending/...)
 * @param {function} params.buildDoc - () => doc để create, thường sẽ sinh orderCode mới mỗi lần
 * @param {number} [params.retries=5]
 */
const createPendingWithRetry = async ({ Model, buildDoc, retries = 5 }) => {
  let lastErr = null;
  for (let i = 0; i < retries; i += 1) {
    try {
      const doc = await Promise.resolve(buildDoc());
      // eslint-disable-next-line no-await-in-loop
      return await Model.create(doc);
    } catch (e) {
      lastErr = e;
      if (!isDuplicateKeyError(e)) throw e;
      // trùng key thì loop lại để sinh lại orderCode/txnRef/requestId mới
    }
  }
  if (lastErr) throw lastErr;
  return null;
};

module.exports = {
  createPendingWithRetry,
};

