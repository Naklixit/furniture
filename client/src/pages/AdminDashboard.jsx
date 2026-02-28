import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Search,
  Plus,
  RotateCw,
  Tag,
  TicketPercent,
  Users,
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";
import { logoutApi } from "../services/auth.api";
import AdminLayout from "./admin/AdminLayout";
import UsersManagementPanel from "./admin/users/UsersManagementPanel";
import CategoriesManagementPanel from "./admin/categories/CategoriesManagementPanel";
import ProductsManagementPanel from "./admin/products/ProductsManagementPanel";
import DiscountCodesManagementPanel from "./admin/discounts/DiscountCodesManagementPanel";
import OrdersManagementPanel from "./admin/orders/OrdersManagementPanel";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const toast = useToast();

  const [activeKey, setActiveKey] = useState("stats");
  const [searchQuery, setSearchQuery] = useState("");

  const displayName = useMemo(
    () => user?.fullName || user?.email || "Quản trị viên",
    [user],
  );

  const navItems = useMemo(
    () => [
      { key: "stats", label: "Thống kê", Icon: BarChart3 },
      { key: "categories", label: "Quản lý danh mục", Icon: Tag },
      { key: "products", label: "Quản lý sản phẩm", Icon: Boxes },
      { key: "discounts", label: "Quản lý mã giảm giá", Icon: TicketPercent },
      { key: "users", label: "Quản lý người dùng", Icon: Users },
      { key: "orders", label: "Quản lý đơn hàng", Icon: ClipboardList },
    ],
    [],
  );

  const toolbarConfig = useMemo(() => {
    switch (activeKey) {
      case "categories":
        return {
          searchPlaceholder: "Tìm kiếm danh mục...",
          primaryActionLabel: "Thêm danh mục",
          showPrimaryAction: true,
        };
      case "products":
        return {
          searchPlaceholder: "Tìm kiếm sản phẩm...",
          primaryActionLabel: "Thêm sản phẩm",
          showPrimaryAction: true,
        };
      case "orders":
        return {
          searchPlaceholder: "Tìm kiếm đơn hàng...",
          primaryActionLabel: "Thêm đơn hàng",
          showPrimaryAction: false,
        };
      case "users":
        return {
          searchPlaceholder: "Tìm kiếm theo tên, email, SĐT...",
          primaryActionLabel: "Thêm người dùng",
          showPrimaryAction: false,
        };
      default:
        return {
          searchPlaceholder: "Tìm kiếm...",
          primaryActionLabel: "Thêm",
          showPrimaryAction: true,
        };
    }
  }, [activeKey]);

  const columns = useMemo(() => {
    switch (activeKey) {
      case "categories":
        return ["#", "Tên danh mục", "Mô tả", "Trạng thái", "Hành động"];
      case "products":
        return ["#", "Sản phẩm", "Danh mục", "Giá", "Trạng thái", "Hành động"];
      case "stats":
        return ["Thông tin", "Giá trị"];
      case "orders":
      default:
        return [
          "Mã đơn hàng",
          "Khách hàng",
          "Ngày đặt",
          "Tổng tiền",
          "Phương thức thanh toán",
          "Trạng thái",
          "Thao tác",
        ];
    }
  }, [activeKey]);

  const isUsersTab = activeKey === "users";
  const isCategoriesTab = activeKey === "categories";
  const isProductsTab = activeKey === "products";
  const isDiscountsTab = activeKey === "discounts";
  const isOrdersTab = activeKey === "orders";
//Đăng xuất
  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // ignore
    } finally {
      logout();
      navigate("/login");
    }
  };

  return (
    <AdminLayout
      navItems={navItems}
      activeKey={activeKey}
      onSelectKey={(key) => {
        setActiveKey(key);
        setSearchQuery("");
      }}
      displayName={displayName}
      email={user?.email || ""}
      onLogout={handleLogout}
    >
      {isUsersTab ? (
        <UsersManagementPanel currentUser={user} toast={toast} />
      ) : isCategoriesTab ? (
        <CategoriesManagementPanel toast={toast} />
      ) : isProductsTab ? (
        <ProductsManagementPanel toast={toast} />
      ) : isDiscountsTab ? (
        <DiscountCodesManagementPanel toast={toast} />
      ) : isOrdersTab ? (
        <OrdersManagementPanel toast={toast} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between gap-3">
            <div className="relative w-full max-w-[360px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={toolbarConfig.searchPlaceholder}
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:border-gray-300"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="w-10 h-10 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center"
                aria-label="Làm mới"
                onClick={() => setSearchQuery("")}
              >
                <RotateCw size={16} />
              </button>
              {toolbarConfig.showPrimaryAction && (
                <button
                  type="button"
                  className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-2"
                  onClick={() => {
                    // Placeholder UI action
                  }}
                >
                  <Plus size={16} />
                  {toolbarConfig.primaryActionLabel}
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm">
                  {columns.map((c) => (
                    <th key={c} className="text-left font-medium px-6 py-4">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td
                    className="px-6 py-10 text-sm text-gray-500"
                    colSpan={columns.length}
                  >
                    Không có dữ liệu (UI layout demo).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 flex items-center justify-end gap-2 bg-white">
            <button
              type="button"
              className="w-9 h-9 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
              aria-label="Trang trước"
            >
              ‹
            </button>
            <button
              type="button"
              className="w-9 h-9 rounded-md border border-blue-500 text-blue-700 font-semibold hover:bg-blue-50"
            >
              1
            </button>
            <button
              type="button"
              className="w-9 h-9 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
              aria-label="Trang sau"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
