import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import InputField from "../components/InputField";
import Button from "../components/Button";
import { forgotPasswordApi } from "../services/auth.api";
import { useToast } from "../context/useToast";
import AuthShell from "../components/AuthShell";

const ForgotPasswordPage = () => {
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canSubmit = useMemo(() => Boolean(email.trim()), [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await forgotPasswordApi({ email: email.trim() });
      const message = res?.message || "OTP đã được gửi. Vui lòng kiểm tra email của bạn.";
      setSuccess(message);
      toast.success(message);
      setTimeout(() => {
        navigate("/verify-otp", { state: { email: email.trim() } });
      }, 500);
    } catch (err) {
      const message = err?.message || "Gửi OTP thất bại";
      setError(message);
      toast.error(message);

      if (err?.code === "OTP_DAILY_LIMIT") {
        setTimeout(() => {
          navigate("/forgot-password");
        }, 250);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="text-4xl font-bold text-gray-900 mb-3">Quên mật khẩu</h1>
      <p className="text-gray-500 mb-12 text-base">Nhập email của bạn và chúng tôi sẽ gửi mã OTP.</p>

      <form onSubmit={handleSubmit}>
        <InputField
          id="email"
          type="email"
          label="Email"
          placeholder="example@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}
        {success ? <div className="mt-4 text-sm text-green-700">{success}</div> : null}

        <div className="mt-8 mb-6">
          <Button variant="primary" type="submit" disabled={!canSubmit} loading={loading}>
            {loading ? "Đang gửi..." : "Gửi mã OTP"}
          </Button>
        </div>
      </form>
    </AuthShell>
  );
};

export default ForgotPasswordPage;
