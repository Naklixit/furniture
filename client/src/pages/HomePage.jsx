import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const HomePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const role = user?.role || "unknown";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-10 rounded-lg shadow text-center max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🏠 Home Page
        </h1>

        <p className="text-gray-600 mb-8">
          Bạn đang đăng nhập với role <b>{role}</b>.
        </p>

        <button
          onClick={handleLogout}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Logout (về Login)
        </button>
      </div>
    </div>
  );
};

export default HomePage;
