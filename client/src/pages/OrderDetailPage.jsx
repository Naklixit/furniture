import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Armchair, Truck, UserRound, Phone, MapPin } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/useAuth";
import { getMyOrderByIdApi } from "../services/order.api";

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
  cancelled: "Đã hủy",
};

const badgeClassByStatus = (status) => {
  switch (status) {
    case "pending":
      return "bg-amber-50 border-amber-200 text-amber-700";
    case "shipping":
      return "bg-blue-50 border-blue-200 text-blue-700";
    case "completed":
      return "bg-emerald-50 border-emerald-200 text-emerald-700";
    case "cancelled":
      return "bg-red-50 border-red-200 text-red-700";
    default:
      return "bg-gray-50 border-gray-200 text-gray-700";
  }
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthed, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const orderId = String(id || "").trim();
      if (!orderId) return;
      try {
        setLoading(true);
        setError("");
        const res = await getMyOrderByIdApi(orderId);
        if (!mounted) return;
        setOrder(res?.order || null);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Không thể tải đơn hàng");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (!isAuthed) return <Navigate to="/login" replace />;
  if (user?.role === "admin") return <Navigate to="/admin/dashboard" replace />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="max-w-5xl mx-auto px-6 py-10 w-full flex-1">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="h-10 px-4 rounded-xl border border-zinc-200 bg-white inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-emerald-700 transition-colors"
        >
          <ChevronLeft size={18} />
          Quay lại
        </button>

        <div className="mt-4 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden anim-fade-up transition-shadow duration-200 hover:shadow-md">
          <div className="px-6 py-5 border-b border-gray-200 flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-extrabold text-gray-900">Chi tiết đơn hàng</div>
              <div className="mt-1 text-sm text-gray-500">
                {order?.orderCode ? `#${order.orderCode}` : ""}
                {order?.createdAt ? ` • ${formatDateTime(order.createdAt)}` : ""}
              </div>
            </div>

            {order?.status ? (
              <span
                className={
                  "inline-flex items-center justify-center h-7 px-3 rounded-md border text-xs font-bold leading-none whitespace-nowrap " +
                  badgeClassByStatus(order.status)
                }
              >
                {STATUS_LABEL[order.status] || order.status}
              </span>
            ) : null}
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-sm text-gray-500">Đang tải...</div>
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : !order ? (
              <div className="text-sm text-gray-500">Không tìm thấy đơn hàng.</div>
            ) : (
              <>
                <div className="rounded-2xl border border-gray-200 overflow-hidden transition-shadow duration-200 hover:shadow-sm">
                  <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-teal-50 border border-teal-100">
                      <Truck size={16} className="text-teal-700" />
                    </span>
                    <div className="text-sm font-bold text-gray-900">Thông tin giao hàng</div>
                  </div>

                  <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                        <UserRound size={14} className="text-gray-500" />
                        Người nhận
                      </div>
                      <div className="mt-1 text-sm font-bold text-gray-900">
                        {order?.customer?.fullName || "—"}
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                        <Phone size={14} className="text-gray-500" />
                        Số điện thoại
                      </div>
                      <div className="mt-1 text-sm font-bold text-gray-900">
                        {order?.customer?.phoneNumber || "—"}
                      </div>
                    </div>

                    <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                        <MapPin size={14} className="text-gray-500" />
                        Địa chỉ giao hàng
                      </div>
                      <div className="mt-1 text-sm font-semibold text-gray-900 whitespace-pre-line">
                        {order?.shipping?.address || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-gray-200 overflow-hidden transition-shadow duration-200 hover:shadow-sm">
                  <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 border border-amber-200">
                      <Armchair size={16} className="text-amber-700" />
                    </span>
                    <div className="text-sm font-bold text-gray-900">Sản phẩm</div>
                  </div>

                  <div className="px-5 py-4 space-y-4">
                    {(order?.items || []).map((it) => (
                      <div
                        key={String(it?.productId || it?.slug || it?.name || Math.random())}
                        className="flex items-center gap-4 rounded-xl px-3 py-2 -mx-3 transition-colors duration-200 hover:bg-gray-50"
                      >
                        <div className="w-16 h-16 rounded-xl border border-gray-200 bg-white overflow-hidden shrink-0">
                          {it?.imageUrl ? (
                            <img
                              src={it.imageUrl}
                              alt=""
                              className="w-full h-full object-cover transition-transform duration-200 hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900 line-clamp-2">{it?.name || ""}</div>
                          <div className="mt-1 text-xs text-gray-500">Số lượng: {Number(it?.qty || 0)}</div>
                        </div>

                        <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">{formatMoneyVND(it?.lineTotal)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-sm text-gray-500">Tổng tiền</div>
                    <div className="text-base font-extrabold text-teal-700">{formatMoneyVND(order?.total)}</div>
                  </div>
                </div>

                {/* <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => navigate("/profile?tab=orders")}
                    className="h-10 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold transition-transform duration-150 active:scale-[0.99]"
                  >
                    Về danh sách đơn hàng
                  </button>
                </div> */}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
