import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "lucide-react";

import InputField from "../components/InputField";
import Button from "../components/Button";
import { registerApi } from "../services/auth.api";
import { useAuth } from "../context/AuthContext";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ fullName: "", password: "" });

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const canSubmit = useMemo(() => {
    return Boolean(fullName && email && password);
  }, [fullName, email, password]);

  const validate = () => {
    const nextErrors = { fullName: "", password: "" };

    const trimmedFullName = (fullName || "").trim();
    const normalizedFullName = trimmedFullName.replace(/\s+/g, " ");

    if (trimmedFullName.length === 0) {
      nextErrors.fullName = "Họ Tên không được để trống";
    } else if (normalizedFullName.length < 2 || normalizedFullName.length > 50) {
      nextErrors.fullName = "Họ Tên phải có độ dài từ 2 đến 50 ký tự";
    } else if (!/^[\p{L}\p{M}]+(?: [\p{L}\p{M}]+)*$/u.test(normalizedFullName)) {
      nextErrors.fullName = "Họ Tên chỉ được chứa chữ cái (không có số)";
    }

    const pwd = password;
    if (typeof pwd !== "string" || pwd.length === 0) {
      nextErrors.password = "Mật khẩu không được để trống";
    } else if (/^\s+$/.test(pwd)) {
      nextErrors.password = "Mật khẩu không được toàn khoảng trắng";
    } else if (pwd.length < 8 || pwd.length > 64) {
      nextErrors.password = "Mật khẩu phải có độ dài từ 8 đến 64 ký tự";
    }

    setFieldErrors(nextErrors);
    const ok = !nextErrors.fullName && !nextErrors.password;
    return { ok, trimmedFullName: normalizedFullName };
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { ok, trimmedFullName } = validate();
    if (!ok) return;

    setLoading(true);

    try {
      await registerApi({ fullName: trimmedFullName, email: email.trim(), password });
      setSuccess("Register success. You can login now.");
      setTimeout(() => navigate("/login"), 600);
    } catch (err) {
      setError(err?.message || "Register failed");
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

          <h1 className="text-4xl font-bold text-gray-900 mb-3">Đăng Ký</h1>
          <p className="text-gray-500 mb-12 text-base">
            Tạo tài khoản, sau đó quay lại đăng nhập.
          </p>

          <form onSubmit={handleRegister}>
            <InputField
              id="fullName"
              type="text"
              label="Họ Tên"
              placeholder="Nguyen Van A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={validate}
            />
            {fieldErrors.fullName ? (
              <div className="-mt-2 mb-4 text-sm text-red-600">{fieldErrors.fullName}</div>
            ) : null}

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
              onBlur={validate}
            />
            {fieldErrors.password ? (
              <div className="-mt-2 mb-4 text-sm text-red-600">{fieldErrors.password}</div>
            ) : null}

            {error ? (
              <div className="mt-4 text-sm text-red-600">{error}</div>
            ) : null}
            {success ? (
              <div className="mt-4 text-sm text-green-700">{success}</div>
            ) : null}

            <div className="mt-8 mb-6">
              <Button
                variant="primary"
                type="submit"
                disabled={loading || !canSubmit}
              >
                {loading ? "Đang tạo..." : "Tạo tài khoản"}
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

export default RegisterPage;
