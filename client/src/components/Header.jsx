import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  User,
  ChevronDown,
  Search,
  LogOut,
  UserRound,
  ShoppingBag,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/useAuth";
import { logoutApi } from "../services/auth.api";
import { useCartStore } from "../stores/cart.store";
import { listProductsApi } from "../services/product.api";

import { formatMoneyVND } from "../utils/format";

function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isLogin = Boolean(user);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");

  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [suggestItems, setSuggestItems] = useState([]);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const reqSeqRef = useRef(0);

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

  useEffect(() => {
    const onDocClick = (e) => {
      if (!suggestOpen) return;
      const el = searchRef.current;
      if (!el) return;
      if (el.contains(e.target)) return;
      setSuggestOpen(false);
      setHighlightIdx(-1);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [suggestOpen]);

  useEffect(() => {
    const q = String(searchQuery || "").trim();
    const shouldQuery = q.length >= 2;

    setSuggestError("");
    setHighlightIdx(-1);

    if (!shouldQuery) {
      setSuggestItems([]);
      if (!searchFocused) setSuggestOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      const seq = (reqSeqRef.current += 1);
      setSuggestLoading(true);
      setSuggestError("");

      try {
        const res = await listProductsApi({
          search: q,
          page: 1,
          limit: 6,
          includeHidden: false,
          sort: "new",
        });
        if (seq !== reqSeqRef.current) return;
        const items = Array.isArray(res?.items) ? res.items : [];
        setSuggestItems(items);
        if (searchFocused) setSuggestOpen(true);
      } catch (err) {
        if (seq !== reqSeqRef.current) return;
        setSuggestItems([]);
        setSuggestError(err?.message || "Không thể tìm kiếm");
        if (searchFocused) setSuggestOpen(true);
      } finally {
        if (seq === reqSeqRef.current) setSuggestLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, searchFocused]);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
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
    setSuggestOpen(false);
    setHighlightIdx(-1);
    navigate(qs ? `/products?${qs}` : "/products");
  };

  const goToAllResults = (q) => {
    const keyword = String(q || "").trim();
    const params = new URLSearchParams();
    if (keyword) params.set("q", keyword);
    const qs = params.toString();
    setSuggestOpen(false);
    setHighlightIdx(-1);
    inputRef.current?.blur?.();
    navigate(qs ? `/products?${qs}` : "/products");
  };

  const goToProduct = (slug) => {
    const s = String(slug || "").trim();
    if (!s) return;
    setSuggestOpen(false);
    setHighlightIdx(-1);
    inputRef.current?.blur?.();
    navigate(`/products/${encodeURIComponent(s)}`);
  };

  return (
    <header className="w-full border-b border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-20 gap-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="Trang chủ">
          <svg
            viewBox="0 0 30 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-auto"
          >
            <polygon points="1,0 30,0 30,9.5 4.5,9.5" fill="#18181b" />
            <polygon points="7,13 30,13 30,22.5 10.5,22.5" fill="#18181b" />
            <polygon points="13,26 30,26 30,35.5 16.5,35.5" fill="#18181b" />
          </svg>
          <span className="text-[26px] font-bold tracking-tight text-zinc-900 hidden sm:block" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
            FRADEL
          </span>
        </Link>

        {/* Tìm kiếm */}
        <form
          className="hidden md:flex items-center h-10 flex-1 basis-0 mx-6 min-w-[260px] max-w-[360px] lg:max-w-[440px] xl:max-w-[520px shadow-xl]"
          onSubmit={handleSearchSubmit}
        >
          <div ref={searchRef} className="relative w-full h-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                setSearchFocused(true);
                const q = String(searchQuery || "").trim();
                if (q.length >= 2) setSuggestOpen(true);
              }}
              onBlur={() => {
                setSearchFocused(false);
              }}
              onKeyDown={(e) => {
                if (!suggestOpen) {
                  if (e.key === "Escape") {
                    setSuggestOpen(false);
                    setHighlightIdx(-1);
                  }
                  return;
                }

                if (e.key === "Escape") {
                  e.preventDefault();
                  setSuggestOpen(false);
                  setHighlightIdx(-1);
                  return;
                }

                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  const max = (suggestItems || []).length;
                  if (max <= 0) return;
                  setHighlightIdx((prev) => {
                    const next = prev + 1;
                    return next >= max ? 0 : next;
                  });
                  return;
                }

                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  const max = (suggestItems || []).length;
                  if (max <= 0) return;
                  setHighlightIdx((prev) => {
                    const next = prev - 1;
                    return next < 0 ? max - 1 : next;
                  });
                  return;
                }

                if (e.key === "Enter") {
                  if (highlightIdx >= 0 && (suggestItems || [])[highlightIdx]) {
                    e.preventDefault();
                    goToProduct((suggestItems[highlightIdx] || {})?.slug);
                    return;
                  }
                  // default: submit -> go to all results
                }
              }}
              placeholder="Tìm kiếm sản phẩm, thương hiệu..."
              aria-label="Tìm kiếm"
              className="w-full h-full pl-11 pr-4 text-sm outline-none bg-gray-100/80 border border-gray-200 rounded-full placeholder:text-gray-400 focus:bg-white focus:border-gray-300 transition"
            />

            {suggestOpen && (String(searchQuery || "").trim().length >= 2) ? (
              <div className="absolute left-0 right-0 top-[calc(100%+10px)] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50 anim-drop-down">
                <div className="max-h-[360px] overflow-auto">
                  {suggestLoading ? (
                    <div className="px-4 py-4 text-sm text-gray-600">Đang tìm kiếm...</div>
                  ) : suggestError ? (
                    <div className="px-4 py-4 text-sm text-red-600">{suggestError}</div>
                  ) : (suggestItems || []).length === 0 ? (
                    <div className="px-4 py-4 text-sm text-gray-600">Không có kết quả phù hợp.</div>
                  ) : (
                    <ul className="py-2">
                      {(suggestItems || []).map((p, idx) => {
                        const active = idx === highlightIdx;
                        const imgUrl = p?.images?.main?.url || "";
                        const name = p?.name || "";
                        const origPrice = Number(p?.originalPrice || 0);
                        const saleP = Number(p?.salePrice || 0);
                        const isOnSale = saleP > 0 && origPrice > 0 && saleP < origPrice;
                        return (
                          <li
                            key={p?.id || `${p?.slug || ""}-${idx}`}
                            className="anim-fade-up"
                            style={{ animationDelay: `${Math.min(idx * 18, 120)}ms` }}
                          >
                            <button
                              type="button"
                              className={
                                "w-full flex items-center gap-3 px-4 py-2.5 text-left transition " +
                                (active ? "bg-teal-50" : "hover:bg-gray-50")
                              }
                              onMouseEnter={() => setHighlightIdx(idx)}
                              onMouseDown={(e) => {
                                // keep focus until navigation
                                e.preventDefault();
                              }}
                              onClick={() => goToProduct(p?.slug)}
                            >
                              <span className="w-9 h-9 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                                {imgUrl ? (
                                  <img src={imgUrl} alt={name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-gray-400 text-xs">No</span>
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-gray-900 truncate">{name}</span>
                                {isOnSale ? (
                                  <span className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-red-600">{formatMoneyVND(saleP)}</span>
                                    <span className="text-[11px] text-gray-400 line-through">{formatMoneyVND(origPrice)}</span>
                                  </span>
                                ) : (
                                  <span className="block text-xs font-bold text-teal-700">{formatMoneyVND(origPrice || saleP)}</span>
                                )}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-4 py-3 border-t border-gray-100 text-sm font-semibold text-teal-700 hover:bg-gray-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => goToAllResults(searchQuery)}
                >
                  <Search size={16} className="text-teal-700" />
                  Xem tất cả kết quả cho "{String(searchQuery || "").trim()}"
                </button>
              </div>
            ) : null}
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
                    <ShoppingBag size={18} className="text-gray-600" />
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
