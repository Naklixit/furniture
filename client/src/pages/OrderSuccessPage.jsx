import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Copy, Package, ShoppingBag, ReceiptText } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useToast } from "../context/useToast";
import { getMyOrderByIdApi } from "../services/order.api";
import { useCartStore } from "../stores/cart.store";

const formatMoneyVND = (n) => {
  const value = Number(n || 0);
  try {
    return value.toLocaleString("vi-VN") + "đ";
  } catch {
    return String(value) + "đ";
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

export default function OrderSuccessPage() {
  const toast = useToast();
  const clear = useCartStore((s) => s.clear);
  const clearDiscount = useCartStore((s) => s.clearDiscount);

  const [sp] = useSearchParams();
  const orderId = sp.get("orderId") || "";
  const result = sp.get("result") || "success";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (result === "fail") return;
    clear?.();
    clearDiscount?.();
  }, [clear, clearDiscount, result]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

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
  }, [orderId]);

  const title = useMemo(() => {
    if (result === "fail") return "Thanh toán thất bại";
    return "Đặt hàng thành công!";
  }, [result]);

  const copyCode = async () => {
    const code = order?.orderCode;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(String(code));
      toast?.success?.("Đã copy mã đơn hàng");
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="max-w-5xl mx-auto px-6 py-12 w-full flex-1">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-sm">
            <CheckCircle2 size={30} className="text-emerald-600" />
          </div>
          <div className="mt-4 text-2xl md:text-3xl font-bold text-gray-900">{title}</div>
          <div className="mt-1 text-sm text-gray-500">
            {result === "fail" ? "Bạn có thể thử lại hoặc chọn phương thức khác." : "Cảm ơn bạn đã đặt hàng. Chúng tôi sẽ liên hệ xác nhận sớm nhất!"}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-gray-200/70 bg-white overflow-hidden shadow-[0_10px_36px_rgba(15,23,42,0.08)]">
          <div className="px-6 py-4 bg-teal-600 text-white flex items-center justify-between gap-3">
            <div>
              <div className="text-xs/5 opacity-90">Mã đơn hàng</div>
              <div className="text-lg font-bold">{order?.orderCode ? `#${order.orderCode}` : "—"}</div>
            </div>
            <div className="flex items-center gap-2">
              {order?.status ? (
                <span className="inline-flex items-center justify-center h-8 px-3 rounded-full bg-white/15 border border-white/20 text-xs font-bold leading-none whitespace-nowrap">
                  {STATUS_LABEL[order.status] || order.status}
                </span>
              ) : null}
              {order?.orderCode ? (
                <button
                  type="button"
                  onClick={copyCode}
                  className="h-8 px-3 rounded-full bg-white/15 border border-white/20 text-xs font-bold hover:bg-white/20 inline-flex items-center gap-2 leading-none"
                >
                  <Copy size={14} />
                  Copy
                </button>
              ) : null}
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-sm text-gray-500">Đang tải đơn hàng...</div>
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : !order ? (
              <div className="text-sm text-gray-600">Không tìm thấy dữ liệu đơn hàng.</div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-sm font-bold text-gray-900">Thông tin giao hàng</div>
                  <div className="mt-2 text-sm text-gray-700">
                    <div className="font-semibold">{order.customer?.fullName || ""}</div>
                    <div className="text-gray-600">{order.customer?.phoneNumber || ""}</div>
                    <div className="text-gray-600">{order.shipping?.address || ""}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-sm font-bold text-gray-900">Phương thức thanh toán</div>
                  <div className="mt-2 text-sm text-gray-700">
                    {PAYMENT_LABEL[order.payment?.method] || order.payment?.method || ""}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    <Package size={16} className="text-teal-700" />
                    Sản phẩm đã đặt ({order.items?.length || 0})
                  </div>

                  <div className="mt-3 space-y-3">
                    {(order.items || []).map((it) => (
                      <div key={String(it.productId)} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 line-clamp-2">{it.name}</div>
                          <div className="text-xs text-gray-500">Số lượng: {it.qty}</div>
                        </div>
                        <div className="text-sm font-bold text-gray-900 whitespace-nowrap">
                          {formatMoneyVND(it.lineTotal)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 text-sm space-y-2">
                    <div className="flex items-center justify-between text-gray-700">
                      <span>Tạm tính</span>
                      <span className="font-semibold">{formatMoneyVND(order.subtotal)}</span>
                    </div>
                    {Number(order.discount?.amount || 0) > 0 ? (
                      <div className="flex items-center justify-between text-gray-700">
                        <span>Giảm giá</span>
                        <span className="font-semibold text-emerald-700">- {formatMoneyVND(order.discount.amount)}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between text-gray-700">
                      <span>Phí vận chuyển</span>
                      <span className="font-semibold text-teal-700">Miễn phí</span>
                    </div>
                    <div className="pt-2 mt-2 border-t border-gray-200 flex items-center justify-between">
                      <span className="font-bold text-gray-900">Tổng cộng</span>
                      <span className="font-extrabold text-teal-700">{formatMoneyVND(order.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    to="/profile?tab=orders"
                    className="h-11 px-5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-bold inline-flex items-center gap-2"
                  >
                    <ReceiptText size={16} className="text-slate-700" />
                    Xem đơn hàng của tôi
                  </Link>
                  <Link
                    to="/products"
                    className="h-11 px-5 rounded-2xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-sm font-bold inline-flex items-center gap-2"
                  >
                    <ShoppingBag size={16} className="text-teal-700" />
                    Tiếp tục mua sắm
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
