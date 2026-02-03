import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, ChevronDown, Search, LogOut } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { logoutApi } from "../services/auth.api";

function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isLogin = Boolean(user);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const displayName = useMemo(() => {
    return user?.fullName || user?.email || "Account";
  }, [user]);

  const cartCount = 0;

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
      // ignore - still clear local auth
    } finally {
      logout();
      setOpen(false);
      navigate("/login");
    }
  };

  return (
    <header className="w-full border-w bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-xl font-semibold tracking-tight">
          MyShop<span className="text-blue-600">.</span>
        </Link>

        {/* Search */}
        <div className="hidden md:flex items-center border border-gray-200 rounded-full px-4 py-2 w-96 bg-white shadow-sm">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            className="ml-2 w-full outline-none text-sm bg-transparent"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 relative">
          {/* Cart */}
          <div
            className="relative cursor-pointer p-2 rounded-full hover:bg-gray-100 transition"
            onClick={() => navigate("/cart")}
            title="Cart"
          >
            <ShoppingCart size={22} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 text-[10px] min-w-5 h-5 flex items-center justify-center bg-red-500 text-white rounded-full px-1">
                {cartCount}
              </span>
            )}
          </div>

          {/* User */}
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
                  {user?.role === "admin" ? (
                    <button
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm"
                      onClick={() => {
                        setOpen(false);
                        navigate("/admin/dashboard");
                      }}
                    >
                      Admin dashboard
                    </button>
                  ) : null}

                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm"
                    onClick={() => {
                      setOpen(false);
                      navigate("/profile");
                    }}
                  >
                    Profile
                  </button>

                  <div className="h-px bg-gray-100" />

                  <button
                    type="button"
                    className="w-full flex items-center gap-2 text-left px-4 py-3 hover:bg-red-50 text-sm text-red-600"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium rounded-full hover:bg-gray-100 transition"
                onClick={() => navigate("/login")}
              >
                Login
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold rounded-full bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
                onClick={() => navigate("/register")}
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
