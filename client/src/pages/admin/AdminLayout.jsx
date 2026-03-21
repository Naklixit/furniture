import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LogOut, Menu, User as UserIcon } from "lucide-react";

const AdminLayout = ({
  navItems,
  activeKey,
  onSelectKey,
  title,
  displayName,
  email,
  onLogout,
  children,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const activeItem = useMemo(() => {
    return navItems.find((i) => i.key === activeKey) || navItems[0];
  }, [activeKey, navItems]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!profileOpen) return;
      const el = profileRef.current;
      if (!el) return;
      if (el.contains(e.target)) return;
      setProfileOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [profileOpen]);

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <aside className="w-56 bg-white border-r border-gray-200 hidden md:flex md:flex-col h-full overflow-hidden">
        <div className="h-16 px-4 flex items-center border-b border-gray-200">
          <div className="select-none leading-none whitespace-nowrap">
            <span className="text-zinc-900 text-[22px] font-extrabold tracking-tight">FRADEL</span>
            <span className="ml-2 text-teal-500 text-[22px] font-bold tracking-tight align-baseline">ADMIN</span>
          </div>
        </div>

        <nav className="px-2 py-3 flex-1 overflow-y-auto">
          <ul className="space-y-1 text-sm">
            {navItems.map(({ key, label, Icon }) => {
              const active = key === activeKey;
              return (
                <li key={key}>
                  <button
                    type="button"
                    className={
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition " +
                      (active ? "bg-teal-50 text-teal-700" : "text-gray-700 hover:bg-gray-50")
                    }
                    onClick={() => onSelectKey(key)}
                  >
                    {createElement(Icon, {
                      size: 17,
                      className: active ? "text-teal-700" : "text-gray-500",
                    })}
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto p-3 border-t border-gray-200">
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-600 text-sm font-semibold hover:bg-red-50 transition"
            onClick={onLogout}
          >
            <LogOut size={14} />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <header className="relative z-40 h-16 bg-white border-b-2 border-gray-300 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center"
              aria-label="Mở menu"
            >
              <Menu size={20} className="text-gray-700" />
            </button>
            <div className="text-lg md:text-xl font-bold text-gray-800">{title || activeItem?.label}</div>
          </div>

          <div ref={profileRef} className="relative">
            <button
              type="button"
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100"
              onClick={() => setProfileOpen((v) => !v)}
            >
              <span className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center">
                <UserIcon size={18} />
              </span>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-semibold text-gray-800 leading-4 truncate max-w-[180px]">
                  {displayName}
                </div>
                <div className="text-xs text-gray-500">Quản trị viên</div>
              </div>
              <ChevronDown size={16} className={profileOpen ? "rotate-180 transition" : "transition"} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 z-50 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
                <div className="px-4 py-4">
                  <div className="text-sm font-semibold text-gray-800 truncate">{displayName}</div>
                  <div className="mt-1 text-xs text-gray-500 truncate">{email || ""}</div>
                </div>
                <div className="h-px bg-gray-100" />
                <button
                  type="button"
                  className="w-full flex items-center gap-2 text-left px-4 py-3 hover:bg-red-50 text-sm text-red-600"
                  onClick={onLogout}
                >
                  <LogOut size={16} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="relative z-0 flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
