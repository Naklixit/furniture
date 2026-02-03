import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Box } from "lucide-react";

import InputField from "../components/InputField";
import Button from "../components/Button";
import { loginApi, googleLoginApi } from "../services/auth.api";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";

// Component nhỏ cho khối Sign up
const SignUpCard = () => (
  <div className="mt-10 border border-gray-200 rounded-xl p-10 bg-white">
    <h3 className="text-3xl font-semibold text-gray-900">Đăng Ký</h3>
    <p className="text-gray-500 text-base mt-3 leading-relaxed">
      Đăng ký với thông tin bạn đã nhập trong quá trình đăng ký.
    </p>

    <div className="mt-10">
      <Button to="/register" variant="signup" className="max-w-[560px] mx-auto">
        Tạo tài khoản
      </Button>
    </div>
  </div>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e?.preventDefault?.();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const res = await loginApi({ email, password });
      const { user, accessToken } = res;

      if (!user) {
        throw new Error("Chưa nhận được thông tin người dùng");
      }

      login({ user, accessToken });

      if (user.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/");
      }
    } catch (err) {
      const message = err?.message || "Đăng nhập thất bại";
      setError(message);
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
          {/* Logo */}
          <div className="w-14 h-14 bg-[#EBE5F9] rounded-xl flex items-center justify-center mb-8">
            <Box size={28} color="#6D28D9" strokeWidth={2} />
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Đăng Nhập
          </h1>
          <p className="text-gray-500 mb-12 text-base">
            Đăng nhập để có thể truy cập nhiều dịch vụ hơn nhé!
          </p>

          <form onSubmit={handleLogin}>
            <InputField
              id="email"
              type="email"
              label="Email"
              placeholder="john.doe@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <InputField
              id="password"
              type="password"
              label="Password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error ? (
              <div className="mt-4 text-sm text-red-600">{error}</div>
            ) : null}

            <div className="mt-8 mb-6">
              <Button
                variant="primary"
                type="submit"
                disabled={loading || !email.trim() || !password}
              >
                {loading ? "Logging in..." : "Đăng nhập"}
              </Button>
            </div>

            <div className="mb-9">
              <div className="w-full [&>div]:w-full [&>div>div]:w-full [&_iframe]:w-full">
                <GoogleLogin
                  size="large"
                  onSuccess={async (credentialResponse) => {
                    try {
                      setError("");
                      setLoading(true);

                      const credential = credentialResponse?.credential;
                      if (!credential) throw new Error("Google credential missing");

                      const res = await googleLoginApi({ credential });
                      const { user, accessToken } = res;
                      if (!user) throw new Error("Chưa nhận được thông tin người dùng");

                      login({ user, accessToken });

                      if (user.role === "admin") {
                        navigate("/admin/dashboard");
                      } else {
                        navigate("/");
                      }
                    } catch (err) {
                      setError(err?.message || "Đăng nhập Google thất bại");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  onError={() => setError("Đăng nhập Google thất bại")}
                />
              </div>
            </div>

            <div className="flex justify-end mb-8">
              <Link
                to="/forgot-password"
                className="text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors"
              >
                Quên mật khẩu?
              </Link>
            </div>
          </form>

          <SignUpCard />
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
