import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import AdminDashboard from "./pages/AdminDashboard";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import VerifyOtpPage from "./pages/VerifyOtpPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { useAuth } from "./context/AuthContext";
function App() {
  const { user } = useAuth();
  const isAuthed = Boolean(user);
  const defaultAuthedPath = user?.role === "admin" ? "/admin/dashboard" : "/";

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
        path="/admin/dashboard"
        element={
          isAuthed && user?.role === "admin" ? (
            <AdminDashboard />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to={isAuthed ? defaultAuthedPath : "/login"} replace />} />
    </Routes>
  );
}

export default App;
