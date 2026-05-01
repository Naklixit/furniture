import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import InputField from "../components/InputField";
import Button from "../components/Button";
import { verifyOtpApi, forgotPasswordApi } from "../services/auth.api";
import { useToast } from "../context/useToast";
import AuthShell from "../components/AuthShell";
const RESET_TOKEN_KEY = "pwResetToken";
const RESET_EMAIL_KEY = "pwResetEmail";
const maskEmail = (value) => {
  if (!value) return "";
  const at = value.indexOf("@");
  if (at <= 1) return value;
  const name = value.slice(0, at);
  const domain = value.slice(at);
  const visible = Math.min(2, name.length);
  return `${name.slice(0, visible)}${"*".repeat(Math.max(0, name.length - visible))}${domain}`;
};
const VerifyOtpPage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email] = useState(() => {
    return location.state?.email || sessionStorage.getItem(RESET_EMAIL_KEY) || "";
  });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    if (!email) {
      setError("Vui lòng quay lại trang Quên mật khẩu gửi OTP.");
      return;
    }
    sessionStorage.setItem(RESET_EMAIL_KEY, email);
  }, [email]);
  const canSubmit = useMemo(() => Boolean(otp.trim()), [otp]);
  const handleVerify = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!email?.trim()) {
      setError("Thiếu email. Vui lòng quay lại trang Quên mật khẩu.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await verifyOtpApi({ email: email.trim(), otp: otp.trim() });
      const resetToken = res?.resetToken;
      if (!resetToken) throw new Error("Thiếu resetToken");

      sessionStorage.setItem(RESET_TOKEN_KEY, resetToken);
      setSuccess("Đã xác thực OTP, chuyển đến trang đặt lại mật khẩu...");
      toast.success("Xác thực OTP thành công");
      setTimeout(() => {
        navigate("/reset-password", { state: { email: email.trim(), resetToken } });
      }, 500);
    } catch (err) {
      const message = err?.message || "Xác thực OTP thất bại";
      setError(message);
      toast.error(message);
      if (err?.code === "OTP_DAILY_LIMIT") {
        sessionStorage.removeItem(RESET_TOKEN_KEY);
        setTimeout(() => navigate("/forgot-password"), 250);
      }
    } finally {
      setLoading(false);
    }
  };
  const handleResend = async () => {
    if (loading) return;
    if (!email?.trim()) {
      setError("Thiếu email. Vui lòng quay lại trang Quên mật khẩu.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await forgotPasswordApi({ email: email.trim() });
      const message = res?.message || "OTP đã được gửi. Vui lòng kiểm tra email của bạn.";
      setSuccess(message);
      toast.success(message);
    } catch (err) {
      const message = err?.message || "Gửi lại OTP thất bại";
      setError(message);
      toast.error(message);
      if (err?.code === "OTP_DAILY_LIMIT") {
        sessionStorage.removeItem(RESET_TOKEN_KEY);
        setTimeout(() => navigate("/forgot-password"), 250);
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <AuthShell>
      <h1 className="text-4xl font-bold text-gray-900 mb-3">Xác thực OTP</h1>
      <p className="text-gray-500 mb-12 text-base">Nhập mã OTP chúng tôi đã gửi đến email của bạn.</p>
      {email ? (
        <div className="mb-6 text-sm text-gray-600">
          Gửi đến: <span className="font-semibold">{maskEmail(email)}</span>
        </div>
      ) : null}
      <form onSubmit={handleVerify}>
        <InputField
          id="otp"
          type="text"
          label="Mã OTP"
          placeholder="123456"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
        />
        {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}
        {success ? <div className="mt-4 text-sm text-green-700">{success}</div> : null}
        <div className="mt-8 mb-4">
          <Button variant="primary" type="submit" disabled={!canSubmit} loading={loading}>
            {loading ? "Đang xác thực..." : "Xác thực"}
          </Button>
        </div>
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleResend}
            className="text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors"
            disabled={loading || !email.trim()}
          >
            Gửi lại OTP
          </button>
        </div>
      </form>
    </AuthShell>
  );
};
export default VerifyOtpPage;
