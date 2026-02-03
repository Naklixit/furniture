import { useEffect, useMemo, useState } from "react";
import { Box } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import InputField from "../components/InputField";
import Button from "../components/Button";
import { verifyOtpApi, forgotPasswordApi } from "../services/auth.api";

const RESET_TOKEN_KEY = "pwResetToken";

const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!email) {
      setError("Thiếu email. Vui lòng quay lại và nhập email của bạn.");
    }
  }, [email]);

  const canSubmit = useMemo(() => Boolean(email.trim() && otp.trim()), [email, otp]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await verifyOtpApi({ email: email.trim(), otp: otp.trim() });
      const resetToken = res?.resetToken;
      if (!resetToken) throw new Error("Thiếu resetToken");

      sessionStorage.setItem(RESET_TOKEN_KEY, resetToken);
      setSuccess("OTP verified. Redirecting...");
      setTimeout(() => {
        navigate("/reset-password", { state: { email: email.trim(), resetToken } });
      }, 500);
    } catch (err) {
      setError(err?.message || "Xác thực OTP thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (loading) return;
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await forgotPasswordApi({ email: email.trim() });
      setSuccess(res?.message || "OTP đã được gửi. Vui lòng kiểm tra email của bạn.");
    } catch (err) {
      setError(err?.message || "Gửi lại OTP thất bại");
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

          <h1 className="text-4xl font-bold text-gray-900 mb-3">Xác thực OTP</h1>
          <p className="text-gray-500 mb-12 text-base">
            Nhập mã OTP chúng tôi đã gửi đến email của bạn.
          </p>

          <form onSubmit={handleVerify}>
            <InputField
              id="email"
              type="email"
              label="Email"
              placeholder="john.doe@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <InputField
              id="otp"
              type="text"
              label="OTP code"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
            />

            {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}
            {success ? <div className="mt-4 text-sm text-green-700">{success}</div> : null}

            <div className="mt-8 mb-4">
              <Button variant="primary" type="submit" disabled={loading || !canSubmit}>
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

              <Button variant="secondary" to="/login" className="max-w-[200px]">
                Về trang đăng nhập
              </Button>
            </div>
          </form>
        </div>

        
      </div>
    </div>
  );
};

export default VerifyOtpPage;
