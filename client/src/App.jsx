import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import AdminDashboard from "./pages/AdminDashboard";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import VerifyOtpPage from "./pages/VerifyOtpPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ProfilePage from "./pages/ProfilePage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import { useAuth } from "./context/useAuth";
function App() {
  const { user, isAuthed, bootstrapped } = useAuth();
  const defaultAuthedPath = user?.role === "admin" ? "/admin/dashboard" : "/";

  if (!bootstrapped) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-700">
        Đang tải...
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthed ? <Navigate to={defaultAuthedPath} replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthed ? <Navigate to={defaultAuthedPath} replace /> : <RegisterPage />}
      />
      <Route
        path="/forgot-password"
        element={isAuthed ? <Navigate to={defaultAuthedPath} replace /> : <ForgotPasswordPage />}
      />
      <Route
        path="/verify-otp"
        element={isAuthed ? <Navigate to={defaultAuthedPath} replace /> : <VerifyOtpPage />}
      />
      <Route
        path="/reset-password"
        element={isAuthed ? <Navigate to={defaultAuthedPath} replace /> : <ResetPasswordPage />}
      />
      <Route
        path="/"
        element={user?.role === "admin" ? <Navigate to="/admin/dashboard" replace /> : <HomePage />}
      />

      <Route
        path="/products"
        element={user?.role === "admin" ? <Navigate to="/admin/dashboard" replace /> : <ProductsPage />}
      />

      <Route
        path="/products/:slug"
        element={
          user?.role === "admin" ? <Navigate to="/admin/dashboard" replace /> : <ProductDetailPage />
        }
      />

      <Route
        path="/cart"
        element={user?.role === "admin" ? <Navigate to="/admin/dashboard" replace /> : <CartPage />}
      />
      <Route
        path="/admin/dashboard"
        element={
          !isAuthed ? (
            <Navigate to="/login" replace />
          ) : user?.role === "admin" ? (
            <AdminDashboard />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/profile"
        element={
          !isAuthed ? (
            <Navigate to="/login" replace />
          ) : user?.role === "admin" ? (
            <Navigate to="/admin/dashboard" replace />
          ) : (
            <ProfilePage />
          )
        }
      />
      <Route path="*" element={<Navigate to={isAuthed ? defaultAuthedPath : "/"} replace />} />
    </Routes>
  );
}

export default App;
