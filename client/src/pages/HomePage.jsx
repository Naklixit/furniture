import { useAuth } from "../context/AuthContext";
import Header from "../components/Header";

const HomePage = () => {
  const { user } = useAuth();

  const displayName = user?.fullName || user?.email || "Guest";

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl p-10 shadow-sm">
          <h1 className="text-4xl font-bold tracking-tight">Welcome to MyShop</h1>
          <p className="mt-3 text-white/90 text-base">
            Xin chào <span className="font-semibold">{displayName}</span>. Bạn có thể xem sản phẩm và thêm vào giỏ hàng mà không cần đăng nhập.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              className="px-5 py-2.5 rounded-full bg-white text-gray-900 font-semibold hover:bg-gray-100 transition"
            >
              Browse products
            </button>
            <button
              type="button"
              className="px-5 py-2.5 rounded-full bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/15 transition"
            >
              View cart
            </button>
          </div>
        </div>

        <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900">Public browsing</h3>
            <p className="mt-2 text-sm text-gray-600">Xem trước sản phẩm, tìm kiếm, lọc, xem chi tiết mà không cần đăng nhập.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900">Cart without login</h3>
            <p className="mt-2 text-sm text-gray-600">Giỏ hàng có thể lưu local, chỉ yêu cầu đăng nhập khi checkout.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900">Secure checkout</h3>
            <p className="mt-2 text-sm text-gray-600">Khi cần đặt hàng, hệ thống sẽ yêu cầu đăng nhập và xác thực token.</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
