const {
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPasswordWithToken,
} = require("../services/passwordReset.service");

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    const result = await requestPasswordReset({ email });
    // Keep response generic
    return res.json({ message: result.message });
  } catch (err) {
    return next(err);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body || {};
    const result = await verifyPasswordResetOtp({ email, otp });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, password, confirmPassword } = req.body || {};
    const result = await resetPasswordWithToken({
      resetToken,
      password,
      confirmPassword,
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  forgotPassword,
  verifyOtp,
  resetPassword,
};
