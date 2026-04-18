import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  UserRound,
  ShoppingBag,
  LogOut,
  Pencil,
  Save,
  X,
  RotateCw,
  Star,
  Armchair,
  Eye,
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";
import { logoutApi } from "../services/auth.api";
import { updateMeApi } from "../services/user.api";
import { cancelMyOrderApi, listMyOrdersApi } from "../services/order.api";
import ReviewModal from "../components/ReviewModal";

const formatMoneyVND = (n) => {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "0đ";
  try {
    return v.toLocaleString("vi-VN") + " đ";
  } catch {
    return String(v) + " đ";
  }
};

const formatDateTime = (value) => {
  try {
    const d = new Date(value);
    const t = d.getTime();
    if (!Number.isFinite(t)) return "";
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
};

const STATUS_LABEL = {
  pending: "Chờ xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Hủy đơn",
};

const PAYMENT_LABEL = {
  COD: "COD",
  VNPAY: "VNPAY",
  MOMO: "MOMO",
};

const badgeClassByPaymentMethod = (method) => {
  switch (String(method || "").toUpperCase()) {
    case "VNPAY":
      return "bg-violet-50 border-violet-200 text-violet-700";
    case "MOMO":
      return "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700";
    case "COD":
      return "bg-amber-50 border-amber-200 text-amber-700";
    default:
      return "bg-gray-50 border-gray-200 text-gray-700";
  }
};

const badgeClassByStatus = (status) => {
  switch (status) {
    case "pending":
      return "bg-amber-50 border-amber-200 text-amber-700";
    case "completed":
      return "bg-emerald-50 border-emerald-200 text-emerald-700";
    case "shipping":
      return "bg-blue-50 border-blue-200 text-blue-700";
    case "cancelled":
      return "bg-red-50 border-red-200 text-red-700";
    default:
      return "bg-amber-50 border-amber-200 text-amber-700";
  }
};

const getUserInitial = (user) => {
  const name = String(user?.fullName || user?.email || "").trim();
  return (name[0] || "U").toUpperCase();
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, isAuthed, accessToken, logout, login } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") || "profile").toLowerCase();

  const [isEditing, setIsEditing] = useState(false);
  const [didLogout, setDidLogout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState("");

  const fullName = user?.fullName || "";
  const email = user?.email || "";
  const phoneNumber = user?.phoneNumber || "";
  const address = user?.address || "";

  const [draftPhone, setDraftPhone] = useState(phoneNumber);
  const [draftAddress, setDraftAddress] = useState(address);

  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersMeta, setOrdersMeta] = useState({ page: 1, limit: 4, total: 0, totalPages: 1 });
  const [ordersStatus, setOrdersStatus] = useState("");
  const [ordersBusyId, setOrdersBusyId] = useState("");
  const [ordersReloadKey, setOrdersReloadKey] = useState(0);
  const [ordersAnimKey, setOrdersAnimKey] = useState(0);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [reviewInitialProductId, setReviewInitialProductId] = useState("");

  const activeTab = useMemo(() => (tab === "orders" ? "orders" : "profile"), [tab]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (activeTab !== "orders") return;
      try {
        setOrdersLoading(true);
        setOrdersError("");
        const res = await listMyOrdersApi({
          page: ordersMeta.page,
          limit: ordersMeta.limit,
          status: ordersStatus,
        });
        if (!mounted) return;
        const items = Array.isArray(res?.items) ? res.items : [];
        const meta = res?.meta || {};
        setOrders(items);
        setOrdersMeta({
          page: Number(meta.page || 1),
          limit: Number(meta.limit || ordersMeta.limit),
          total: Number(meta.total || 0),
          totalPages: Number(meta.totalPages || 1),
        });
        setOrdersAnimKey((k) => k + 1);
      } catch (e) {
        if (!mounted) return;
        setOrdersError(e?.message || "Không thể tải đơn hàng");
      } finally {
        if (!mounted) return;
        setOrdersLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [activeTab, ordersMeta.page, ordersMeta.limit, ordersStatus, ordersReloadKey]);

  if (didLogout) return <Navigate to="/" replace />;
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (user?.role === "admin") return <Navigate to="/admin/dashboard" replace />;

  const setTab = (nextTab) => {
    setIsEditing(false);
    setSaveError("");
    setSaveOk("");
    setSearchParams({ tab: nextTab });
  };

  const canCancelOrder = (order) => {
    if (!order) return false;
    const s = String(order.status || "").toLowerCase();
    if (!s) return false;
    if (s === "completed") return false;
    if (s === "cancelled") return false;
    return true;
  };

  const cancelOrder = async (order) => {
    const id = order?.id;
    if (!id) return;
    if (ordersBusyId) return;
    if (!canCancelOrder(order)) {
      toast?.error?.("Đơn hàng này không thể hủy");
      return;
    }
    const ok = window.confirm("Bạn có chắc muốn hủy đơn hàng này không?");
    if (!ok) return;

    try {
      setOrdersBusyId(id);
      const res = await cancelMyOrderApi(id);
      const next = res?.order;
      if (next?.id) {
        setOrders((prev) => prev.map((x) => (x?.id === next.id ? next : x)));
      } else {
        setOrdersReloadKey((k) => k + 1);
      }
      toast?.success?.("Đã hủy đơn hàng");
    } catch (e) {
      toast?.error?.(e?.message || "Không thể hủy đơn hàng");
    } finally {
      setOrdersBusyId("");
    }
  };

  const openReview = (order, productId) => {
    if (!order?.id) return;
    if (order?.status !== "completed") {
      toast?.error?.("Chỉ có thể đánh giá khi đơn đã hoàn thành");
      return;
    }
    setReviewOrder(order);
    setReviewInitialProductId(String(productId || ""));
    setReviewOpen(true);
  };

  const goToOrderDetail = (order) => {
    const id = order?.id;
    if (!id) return;
    navigate(`/orders/${encodeURIComponent(id)}`);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaveError("");
    setSaveOk("");

    try {
      setSaving(true);
      const res = await updateMeApi({
        phoneNumber: (draftPhone || "").trim(),
        address: draftAddress || "",
      });

      const nextUser = res?.user;
      if (nextUser) {
        login({ user: nextUser, accessToken });
      }

      setIsEditing(false);
      setSaveOk("Đã lưu thông tin.");
    } catch (err) {
      setSaveError(err?.message || "Không thể lưu thông tin. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setDidLogout(true);
    try {
      await logoutApi();
    } catch {
      // Bỏ qua lỗi
    } finally {
      logout();
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <ReviewModal
        open={reviewOpen}
        order={reviewOrder}
        initialProductId={reviewInitialProductId}
        onClose={() => setReviewOpen(false)}
        onCreated={() => {
          setOrdersReloadKey((k) => k + 1);
        }}
      />

      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          {/* Thanh bên */}
          <aside className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm anim-fade-up transition-shadow duration-200 hover:shadow-md self-start h-fit">
            <div className="bg-gradient-to-r from-zinc-600 to-emerald-600 px-5 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/15 border border-white/20 flex items-center justify-center font-extrabold">
                  {getUserInitial(user)}
                </div>
                <div className="min-w-0">
                  <div className="text-base font-bold truncate">{fullName || "Tài khoản"}</div>
                  <div className="text-xs opacity-90 truncate">{email || ""}</div>
                </div>
              </div>
            </div>

            <div className="p-3">
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setTab("profile")}
                  className={
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 text-left border " +
                    (activeTab === "profile"
                      ? "bg-teal-50 text-teal-800 border-teal-100"
                      : "text-gray-700 border-transparent hover:bg-gray-50 hover:translate-x-[2px]")
                  }
                >
                  <UserRound size={18} className={activeTab === "profile" ? "text-teal-700" : "text-gray-500"} />
                  <span className="font-medium">Thông tin cá nhân</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTab("orders")}
                  className={
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 text-left border " +
                    (activeTab === "orders"
                      ? "bg-teal-50 text-teal-800 border-teal-100"
                      : "text-gray-700 border-transparent hover:bg-gray-50 hover:translate-x-[2px]")
                  }
                >
                  <ShoppingBag size={18} className={activeTab === "orders" ? "text-teal-700" : "text-gray-500"} />
                  <span className="font-medium">Đơn hàng của tôi</span>
                </button>

                <div className="pt-2">
                  <div className="h-px bg-gray-100" />
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-700 hover:bg-red-50 transition text-left"
                >
                  <LogOut size={18} className="text-red-600" />
                  <span className="font-medium">Đăng xuất</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Nội dung */}
          <section className="bg-white border border-gray-200 rounded-2xl shadow-sm min-h-[560px] overflow-hidden anim-fade-up transition-shadow duration-200 hover:shadow-md">
            {activeTab === "profile" ? (
              <>
                <div className="px-6 py-5 border-b border-gray-200">
                  <div className="text-base font-semibold text-gray-900">Thông tin cá nhân</div>
                </div>

                {saveError || saveOk ? (
                  <div
                    className={
                      "px-6 py-3 text-sm border-b " +
                      (saveError
                        ? "bg-red-50 text-red-700 border-red-100"
                        : "bg-green-50 text-green-700 border-green-100")
                    }
                  >
                    {saveError || saveOk}
                  </div>
                ) : null}

                <div className="p-6">
                  <div className="rounded-2xl bg-gradient-to-r from-zinc-600 to-emerald-600 text-white p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-transform duration-200 hover:-translate-y-0.5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                        <UserRound size={28} className="text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-lg font-bold truncate">{fullName || "Tài khoản"}</div>
                        <div className="text-sm/5 opacity-90 truncate">{email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isEditing ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDraftPhone(phoneNumber);
                            setDraftAddress(address);
                            setIsEditing(true);
                          }}
                          className="h-10 px-4 rounded-xl bg-white text-teal-700 text-sm font-bold shadow-sm hover:bg-teal-50 inline-flex items-center gap-2 transition-transform duration-150 active:scale-[0.99]"
                        >
                          <Pencil size={16} />
                          Chỉnh sửa
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className={
                              "h-10 px-4 rounded-xl text-sm font-bold shadow-sm transition-all inline-flex items-center gap-2 active:scale-[0.99] " +
                              (saving
                                ? "bg-white/60 text-teal-900 cursor-not-allowed"
                                : "bg-white text-teal-700 hover:bg-teal-50")
                            }
                          >
                            <Save size={16} />
                            {saving ? "Đang lưu..." : "Lưu"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDraftPhone(phoneNumber);
                              setDraftAddress(address);
                              setSaveError("");
                              setSaveOk("");
                              setIsEditing(false);
                            }}
                            className="h-10 px-4 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-bold hover:bg-white/15 inline-flex items-center gap-2 transition-transform duration-150 active:scale-[0.99]"
                          >
                            <X size={16} />
                            Hủy
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-teal-200 bg-white p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                      <div className="text-sm font-bold text-teal-900">Thông tin liên hệ</div>
                      <div className="mt-4 space-y-4">
                        <div>
                          <div className="text-xs font-semibold text-gray-600">Số điện thoại</div>
                          <div className="mt-1">
                            {isEditing ? (
                              <input
                                value={draftPhone}
                                onChange={(e) => {
                                  const digits = (e.target.value || "").replace(/\D/g, "").slice(0, 10);
                                  setDraftPhone(digits);
                                }}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={10}
                                className="w-full h-11 px-4 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-teal-200"
                                placeholder="Nhập số điện thoại"
                              />
                            ) : (
                              <div className="h-11 px-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center text-sm text-gray-900">
                                {phoneNumber || "—"}
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-gray-600">Email</div>
                          <div className="mt-1 h-11 px-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center text-sm text-gray-900">
                            {email || "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                      <div className="text-sm font-bold text-gray-900">Địa chỉ giao hàng</div>
                      <div className="mt-4">
                        {isEditing ? (
                          <textarea
                            value={draftAddress}
                            onChange={(e) => setDraftAddress(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-teal-200"
                            placeholder="Nhập địa chỉ"
                          />
                        ) : (
                          <div className="min-h-[104px] px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-900 whitespace-pre-line">
                            {address || "—"}
                          </div>
                        )}

                        {isEditing ? (
                          <div className="mt-3 text-xs text-gray-500">
                            Bạn có thể cập nhật số điện thoại và địa chỉ.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="px-6 py-5 border-b drop-shadow border-gray-200 ">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <div className="text-xl font-bold text-gray-900">Đơn hàng của tôi</div>
                      <div className="text-sm text-gray-500 font-bold">Theo dõi và quản lý đơn hàng của bạn</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOrdersReloadKey((k) => k + 1)}
                      className="h-10 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold inline-flex items-center gap-2"
                    >
                      <RotateCw size={16} />
                      Tải lại
                    </button>
                  </div>

                  <div className="mt-5 -mb-1 border border-gray-200 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-5 bg-white">
                      {[{ k: "", t: "Tất cả" },
                        { k: "pending", t: "Chờ xác nhận" },
                        { k: "shipping", t: "Đang giao" },
                        { k: "completed", t: "Hoàn thành" },
                        { k: "cancelled", t: "Đã hủy" }].map((x) => {
                        const active = (ordersStatus || "") === x.k;
                        return (
                          <button
                            key={x.k || "all"}
                            type="button"
                            onClick={() => {
                              setOrdersMeta((m) => ({ ...m, page: 1 }));
                              setOrdersStatus(x.k);
                            }}
                            className={
                              "px-3 py-3 text-sm font-bold border-b-2 transition text-center " +
                              (active
                                ? "border-teal-600 text-teal-700 bg-teal-50/40"
                                : "border-transparent text-gray-600 hover:bg-gray-50")
                            }
                          >
                            {x.t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {ordersLoading ? (
                    <div className="text-sm text-gray-500">Đang tải đơn hàng...</div>
                  ) : ordersError ? (
                    <div className="text-sm text-red-600">{ordersError}</div>
                  ) : (orders || []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
                      <div className="text-sm font-semibold text-gray-900">Chưa có đơn hàng</div>
                      <div className="mt-1 text-sm text-gray-600">
                        Khi bạn đặt hàng, danh sách đơn hàng sẽ hiển thị ở đây.
                      </div>
                    </div>
                  ) : (
                    <div key={ordersAnimKey} className="anim-fade-up">
                      <div className="space-y-4">
                        {(orders || []).map((o) => (
                          <div
                            key={String(o?.id || "")}
                            className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xl transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                          >
                            {/* Header */}
                            <div className="px-6 py-4 bg-gray-50 flex items-center justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 border border-amber-200">
                                    <Armchair size={16} className="text-amber-700" />
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <div className="text-sm font-bold text-gray-900">{o?.orderCode ? `#${o.orderCode}` : "—"}</div>
                                      <div className="text-xs text-gray-500">{o?.createdAt ? formatDateTime(o.createdAt) : ""}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {o?.status ? (
                                <span
                                  className={
                                    "inline-flex items-center justify-center h-7 px-3 rounded-md border text-xs font-bold leading-none whitespace-nowrap " +
                                    badgeClassByStatus(o.status)
                                  }
                                >
                                  {STATUS_LABEL[o.status] || o.status}
                                </span>
                              ) : null}
                            </div>

                            {/* Items */}
                            <div className="px-6 py-4 border-t border-gray-100">
                              <div className="space-y-4">
                                {(o?.items || []).map((it) => (
                                  <div
                                    key={String(it?.productId || it?.slug || it?.name || Math.random())}
                                    className="flex items-center gap-4"
                                  >
                                    <div className="w-16 h-16 rounded-xl border border-gray-200 bg-white overflow-hidden shrink-0">
                                      {it?.imageUrl ? (
                                        <img src={it.imageUrl} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full bg-gray-100" />
                                      )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-semibold text-gray-900 line-clamp-2">{it?.name || ""}</div>
                                      <div className="mt-1 text-xs font-semibold text-gray-700">Số lượng: {Number(it?.qty || 0)}</div>

                                      {o?.status === "completed" ? (
                                        <button
                                          type="button"
                                          onClick={() => openReview(o, it?.productId)}
                                          className="mt-2 h-8 px-3 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold inline-flex items-center gap-2"
                                        >
                                          <Star size={14} className="text-teal-700" />
                                          Đánh giá
                                        </button>
                                      ) : null}
                                    </div>

                                    <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                                      {formatMoneyVND(it?.lineTotal)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="text-xs font-semibold text-gray-700">
                                Tổng tiền: <span className="text-base font-extrabold text-teal-700">{formatMoneyVND(o?.total)}</span>
                              </div>

                              <div className="flex items-center gap-3 justify-end">
                                {canCancelOrder(o) ? (
                                  <button
                                    type="button"
                                    onClick={() => cancelOrder(o)}
                                    disabled={ordersBusyId === o?.id}
                                    className={
                                      "h-9 px-4 rounded-lg text-sm font-bold border transition " +
                                      (ordersBusyId === o?.id
                                        ? "bg-red-50 border-red-200 text-red-700 cursor-not-allowed opacity-70"
                                        : "bg-white border-red-300 text-red-700 hover:bg-red-50")
                                    }
                                  >
                                    {ordersBusyId === o?.id ? "Đang hủy..." : "Hủy đơn"}
                                  </button>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={() => goToOrderDetail(o)}
                                  className="h-9 px-4 rounded-lg text-sm font-semibold border border-gray-300 bg-white hover:bg-gray-50 inline-flex items-center gap-2 transition-transform duration-150 active:scale-[0.99]"
                                >
                                  <Eye size={16} className="text-gray-600" />
                                  Chi tiết
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-3">
                        <div className="text-xs text-gray-500">
                          Tổng: <span className="font-semibold text-gray-700">{ordersMeta.total}</span> đơn hàng
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={ordersMeta.page <= 1}
                            onClick={() => setOrdersMeta((m) => ({ ...m, page: Math.max(1, m.page - 1) }))}
                            className={
                              "h-9 px-3 rounded-xl border text-sm font-semibold transition-transform duration-150 active:scale-[0.99] " +
                              (ordersMeta.page <= 1
                                ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50")
                            }
                          >
                            Trước
                          </button>
                          <div className="text-sm text-gray-600">
                            Trang <span className="font-semibold text-gray-900">{ordersMeta.page}</span>/ {ordersMeta.totalPages}
                          </div>
                          <button
                            type="button"
                            disabled={ordersMeta.page >= ordersMeta.totalPages}
                            onClick={() =>
                              setOrdersMeta((m) => ({
                                ...m,
                                page: Math.min(m.totalPages, m.page + 1),
                              }))
                            }
                            className={
                              "h-9 px-3 rounded-xl border text-sm font-semibold transition-transform duration-150 active:scale-[0.99] " +
                              (ordersMeta.page >= ordersMeta.totalPages
                                ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50")
                            }
                          >
                            Sau
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
