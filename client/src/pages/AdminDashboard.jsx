import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  ClipboardList,
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
import StatsPanel from "./admin/stats/StatsPanel";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const toast = useToast();

  const [activeKey, setActiveKey] = useState("stats");

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

  const isStatsTab = activeKey === "stats";
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
      }}
      displayName={displayName}
      email={user?.email || ""}
      onLogout={handleLogout}
    >
      {isStatsTab ? (
        <StatsPanel toast={toast} />
      ) : isUsersTab ? (
        <UsersManagementPanel currentUser={user} toast={toast} />
      ) : isCategoriesTab ? (
        <CategoriesManagementPanel toast={toast} />
      ) : isProductsTab ? (
        <ProductsManagementPanel toast={toast} />
      ) : isDiscountsTab ? (
        <DiscountCodesManagementPanel toast={toast} />
      ) : isOrdersTab ? (
        <OrdersManagementPanel toast={toast} />
      ) : null}
    </AdminLayout>
  );
};

export default AdminDashboard;
