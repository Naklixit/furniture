import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import AdminDashboard from "./pages/AdminDashboard";
import { useAuth } from "./context/AuthContext";
function App() {
  const { user } = useAuth();
  const isAuthed = Boolean(user);

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthed ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthed ? <Navigate to="/" replace /> : <RegisterPage />}
      />
      <Route
        path="/"
        element={isAuthed ? <HomePage /> : <Navigate to="/login" replace />}
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
      <Route path="*" element={<Navigate to={isAuthed ? "/" : "/login"} replace />} />
    </Routes>
  );
}

export default App;
