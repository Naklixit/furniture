import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, ChevronDown, Search } from "lucide-react";
import { useState } from "react";

function Header() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const user = {
    isLogin: true,
    fullName: "Duy Tran",
  };

  const cartCount = 3;

  return (
    <header className="w-full h-16 border-b bg-white">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-xl font-semibold">
          MyShop
        </Link>

        {/* Search */}
        <div className="hidden md:flex items-center border rounded-md px-3 py-1 w-80">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            className="ml-2 w-full outline-none text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-6 relative">
          {/* Cart */}
          <div
            className="relative cursor-pointer"
            onClick={() => navigate("/cart")}
          >
            <ShoppingCart size={22} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 text-xs bg-red-500 text-white rounded-full px-1">
                {cartCount}
              </span>
            )}
          </div>

          {/* User */}
          {user.isLogin ? (
            <div
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={() => setOpen(!open)}
            >
              <User size={20} />
              <span className="text-sm">{user.fullName}</span>
              <ChevronDown size={16} />

              {open && (
                <div className="absolute right-0 top-12 w-40 bg-white border rounded-md shadow-md">
                  <div
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => navigate("/profile")}
                  >
                    Profile
                  </div>
                  <div
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-red-500"
                    onClick={() => console.log("logout")}
                  >
                    Logout
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              className="px-4 py-2 bg-black text-white rounded-md text-sm"
              onClick={() => navigate("/login")}
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
