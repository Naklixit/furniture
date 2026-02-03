import { useMemo, useState } from "react";
import { Box } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import InputField from "../components/InputField";
import Button from "../components/Button";
import { resetPasswordApi } from "../services/auth.api";

const RESET_TOKEN_KEY = "pwResetToken";

const ResetPasswordPage = () => {
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
      setError("Missing reset token. Please verify OTP again.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await resetPasswordApi({ resetToken, password, confirmPassword });
      setSuccess(res?.message || "Password reset success");
      sessionStorage.removeItem(RESET_TOKEN_KEY);
      setTimeout(() => navigate("/login"), 600);
    } catch (err) {
      setError(err?.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white font-sans">
      {/* LEFT IMAGE */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=2070&auto=format&fit=crop"
          alt="Luxury Interior"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/5"></div>
      </div>

      {/* RIGHT FORM */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 md:p-16 lg:p-24 bg-white overflow-y-auto h-screen">
        <div>
          <div className="w-14 h-14 bg-[#EBE5F9] rounded-xl flex items-center justify-center mb-8">
            <Box size={28} color="#6D28D9" strokeWidth={2} />
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-3">Reset password</h1>
          <p className="text-gray-500 mb-12 text-base">
            Đặt mật khẩu mới cho tài khoản của bạn.
          </p>

          <form onSubmit={handleSubmit}>
            <InputField
              id="password"
              type="password"
              label="New password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <InputField
              id="confirmPassword"
              type="password"
              label="Confirm new password"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}
            {success ? <div className="mt-4 text-sm text-green-700">{success}</div> : null}

            <div className="mt-8 mb-6">
              <Button variant="primary" type="submit" disabled={loading || !canSubmit}>
                {loading ? "Đang lưu..." : "Lưu mật khẩu mới"}
              </Button>
            </div>

            <Button variant="secondary" to="/login">
              Quay lại đăng nhập
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default ResetPasswordPage;
