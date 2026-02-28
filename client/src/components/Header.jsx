import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, ChevronDown, Search, LogOut, UserRound, Package, Home } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/useAuth";
import { logoutApi } from "../services/auth.api";
import { useCartStore } from "../stores/cart.store";

function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isLogin = Boolean(user);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");

  const displayName = useMemo(() => {
    return user?.fullName || user?.email || "Tài khoản";
  }, [user]);

  const cartCount = useCartStore((s) => (typeof s.count === "function" ? s.count() : 0));

  useEffect(() => {
    const onDocClick = (e) => {
      if (!open) return;
      const el = menuRef.current;
      if (!el) return;
      if (el.contains(e.target)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // Bỏ qua lỗi - vẫn xoá trạng thái đăng nhập cục bộ
    } finally {
      logout();
      setOpen(false);
      navigate("/");
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();

    const params = new URLSearchParams();
    if (q) params.set("q", q);

    const qs = params.toString();
    navigate(qs ? `/products?${qs}` : "/products");
  };

  return (
    <header className="w-full border-g bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-20 gap-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Trang chủ">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
            <Home className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-zinc-900 hidden sm:block">
            FRADEL
          </span>
        </Link>

        {/* Tìm kiếm */}
        <form
          className="hidden md:flex items-center h-10 flex-1 basis-0 mx-6 min-w-[260px] max-w-[360px] lg:max-w-[440px] xl:max-w-[520px]"
          onSubmit={handleSearchSubmit}
        >
          <div className="relative w-full h-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm sản phẩm, thương hiệu..."
              aria-label="Tìm kiếm"
              className="w-full h-full pl-11 pr-4 text-sm outline-none bg-gray-100/80 border border-gray-200 rounded-full placeholder:text-gray-400 focus:bg-white focus:border-gray-300 transition"
            />
          </div>
        </form>

        {/* Thao tác */}
        <div className="flex items-center gap-4 relative shrink-0">
          {/* Giỏ hàng */}
          <button
            type="button"
            className="relative cursor-pointer px-3 py-2 rounded-full hover:bg-gray-100 transition flex items-center gap-2"
            onClick={() => navigate("/cart")}
            title="Giỏ hàng"
          >
            <span className="relative">
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -left-2 text-[10px] min-w-4 h-4 flex items-center justify-center bg-red-500 text-white rounded-full px-1 ring-2 ring-white shadow-sm">
                  {cartCount}
                </span>
              )}
            </span>
            <span className="hidden sm:inline text-sm font-medium text-gray-800">Giỏ hàng</span>
            {cartCount > 0 && (
              <span className="sr-only">{cartCount} sản phẩm</span>
            )}
          </button>

          {/* Người dùng */}
          {isLogin ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                className="flex items-center gap-2 select-none px-3 py-2 rounded-full hover:bg-gray-100 transition"
                onClick={() => setOpen((v) => !v)}
              >
                <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center">
                  <User size={18} />
                </span>
                <span className="text-sm font-medium max-w-[140px] truncate">{displayName}</span>
                <ChevronDown size={16} className={open ? "rotate-180 transition" : "transition"} />
              </button>

              {open && (
                <div className="absolute right-0 top-12 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 text-left px-4 py-3 hover:bg-gray-50 text-sm text-gray-800"
                    onClick={() => {
                      setOpen(false);
                      navigate("/profile?tab=profile");
                    }}
                  >
                    <UserRound size={18} className="text-gray-600" />
                    Thông tin tài khoản
                  </button>

                  <button
                    type="button"
                    className="w-full flex items-center gap-3 text-left px-4 py-3 hover:bg-gray-50 text-sm text-gray-800"
                    onClick={() => {
                      setOpen(false);
                      navigate("/profile?tab=orders");
                    }}
                  >
                    <Package size={18} className="text-gray-600" />
                    Đơn hàng của tôi
                  </button>

                  <div className="h-px bg-gray-100" />

                  <button
                    type="button"
                    className="w-full flex items-center gap-2 text-left px-4 py-3 hover:bg-red-50 text-sm text-red-600"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium hover:bg-gray-100 shadow-sm transition"
                onClick={() => navigate("/login")}
              >
                Đăng Nhập
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold  bg-orange-500 hover:bg-orange-600 text-white  transition shadow-sm"
                onClick={() => navigate("/register")}
              >
                Đăng Ký
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
