import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import InputField from "../components/InputField";
import Button from "../components/Button";
import { resetPasswordApi } from "../services/auth.api";
import { useToast } from "../context/useToast";
import AuthShell from "../components/AuthShell";
const RESET_TOKEN_KEY = "pwResetToken";
const ResetPasswordPage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const initialResetToken =
    location.state?.resetToken || sessionStorage.getItem(RESET_TOKEN_KEY) || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken] = useState(initialResetToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canSubmit = useMemo(() => {
    return Boolean(resetToken && password && confirmPassword);
  }, [resetToken, password, confirmPassword]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setSuccess("");
    if (!resetToken) {
      const message = "Mất mã đặt lại mật khẩu. Vui lòng thử lại quá trình quên mật khẩu.";
      setError(message);
      toast.error(message);
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu không khớp");
      return;
    }
    setLoading(true);
    try {
      const res = await resetPasswordApi({ resetToken, password, confirmPassword });
      setSuccess(res?.message || "Đặt lại mật khẩu thành công");
      toast.success(res?.message || "Đặt lại mật khẩu thành công");
      sessionStorage.removeItem(RESET_TOKEN_KEY);
      setTimeout(() => navigate("/login"), 600);
    } catch (err) {
      const message = err?.message || "Đặt lại mật khẩu thất bại";
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
      <h1 className="text-4xl font-bold text-gray-900 mb-3">Đặt lại mật khẩu</h1>
      <p className="text-gray-500 mb-12 text-base">Đặt mật khẩu mới cho tài khoản của bạn.</p>
      <form onSubmit={handleSubmit}>
        <InputField
          id="password"
          type="password"
          label="Mật khẩu mới"
          placeholder="••••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <InputField
          id="confirmPassword"
          type="password"
          label="Xác nhận mật khẩu mới"
          placeholder="••••••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}
        {success ? <div className="mt-4 text-sm text-green-700">{success}</div> : null}

        <div className="mt-8 mb-6">
          <Button variant="primary" type="submit" disabled={!canSubmit} loading={loading}>
            {loading ? "Đang lưu..." : "Lưu mật khẩu mới"}
          </Button>
        </div>
      </form>
    </AuthShell>
  );
};
export default ResetPasswordPage;
