import { useMemo, useState } from "react";
import { Box } from "lucide-react";
import { useNavigate } from "react-router-dom";

import InputField from "../components/InputField";
import Button from "../components/Button";
import { forgotPasswordApi } from "../services/auth.api";

const ForgotPasswordPage = () => {
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
      setSuccess(res?.message || "OTP sent. Please check your email.");
      setTimeout(() => {
        navigate("/verify-otp", { state: { email: email.trim() } });
      }, 500);
    } catch (err) {
      setError(err?.message || "Failed to send OTP");
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

          <h1 className="text-4xl font-bold text-gray-900 mb-3">Quên mật khẩu</h1>
          <p className="text-gray-500 mb-12 text-base">
            Nhập email của bạn và chúng tôi sẽ gửi mã OTP.
          </p>

          <form onSubmit={handleSubmit}>
            <InputField
              id="email"
              type="email"
              label="Email"
              placeholder="john.doe@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}
            {success ? <div className="mt-4 text-sm text-green-700">{success}</div> : null}

            <div className="mt-8 mb-6">
              <Button variant="primary" type="submit" disabled={loading || !canSubmit}>
                {loading ? "Đang gửi..." : "Gửi mã OTP"}
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

export default ForgotPasswordPage;
