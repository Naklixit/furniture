import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

import InputField from "../components/InputField";
import Button from "../components/Button";
import { loginApi, googleLoginApi } from "../services/auth.api";
import { useAuth } from "../context/useAuth";
import { GoogleLogin } from "@react-oauth/google";
import { useToast } from "../context/useToast";
import AuthShell from "../components/AuthShell";

// Component nhỏ cho khối Đăng ký
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
  const toast = useToast();

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
      //truyền message vào toast với .status là success để hiện màu xanh, còn error sẽ hiện màu đỏ
      toast.success("Đăng nhập thành công");

      if (user.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/");
      }
    } catch (err) {
      const message = err?.message || "Đăng nhập thất bại";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="bg-white">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Đăng Nhập</h1>

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
            label="Mật khẩu"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}

          <div className="mt-8 mb-6">
            <Button
              variant="primary"
              type="submit"
              disabled={!email.trim() || !password}
              loading={loading}
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </div>

          <div className="relative my-6">
            <div className="h-px w-full bg-gray-200" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-gray-500">
              Hoặc
            </div>
          </div>

          <div className={loading ? "opacity-70 pointer-events-none" : ""}>
            <div className="w-full [&>div]:w-full [&>div>div]:w-full [&_iframe]:w-full">
              <GoogleLogin
                size="large"
                onSuccess={async (credentialResponse) => {
                  try {
                    setError("");
                    setLoading(true);

                    const credential = credentialResponse?.credential;
                    if (!credential) throw new Error("Thiếu thông tin xác thực Google");

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
    </AuthShell>
  );
};

export default LoginPage;
