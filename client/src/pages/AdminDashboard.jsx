import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      
      {/* Sidebar giả */}
      <aside className="w-64 bg-gray-800 p-6 hidden md:block">
        <h2 className="text-xl font-bold mb-6">Admin Panel</h2>
        <ul className="space-y-4 text-gray-300">
          <li className="hover:text-white cursor-pointer">Dashboard</li>
          <li className="hover:text-white cursor-pointer">Users</li>
          <li className="hover:text-white cursor-pointer">Products</li>
          <li className="hover:text-white cursor-pointer">Orders</li>
        </ul>
      </aside>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">
            🛠 Admin Dashboard
          </h1>

          <p className="text-gray-300 mb-8">
            Bạn đang đăng nhập với role <b>admin</b>.
          </p>

          <button
            onClick={() => navigate("/login")}
            className="px-6 py-2 bg-red-600 rounded hover:bg-red-700 transition"
          >
            Logout (về Login)
          </button>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
