import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCartStore } from "../stores/cart.store";
import { useToast } from "../context/useToast";
import { validateDiscountCodeApi } from "../services/discountCode.api";
import { ShieldCheck, Trash2, Truck } from "lucide-react";
import { useAuth } from "../context/useAuth";

const formatMoneyVND = (n) => {
  const value = Number(n || 0);
  try {
    return value.toLocaleString("vi-VN") + "đ";
  } catch {
    return String(value) + "đ";
  }
};

export default function CartPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthed } = useAuth();
  const items = useCartStore((s) => s.items || []);
  const discount = useCartStore((s) => s.discount);
  const setDiscount = useCartStore((s) => s.setDiscount);
  const clearDiscount = useCartStore((s) => s.clearDiscount);
  const removeItem = useCartStore((s) => s.removeItem);
  const setQty = useCartStore((s) => s.setQty);
  const incQty = useCartStore((s) => s.incQty);
  const clear = useCartStore((s) => s.clear);

  const [discountInput, setDiscountInput] = useState("");
  const [applying, setApplying] = useState(false);

  const handleRemove = (productId) => {
    removeItem?.(productId);
    toast?.info?.("Đã xoá sản phẩm khỏi giỏ hàng");
  };

  const handleClear = () => {
    clear?.();
    toast?.info?.("Đã xoá tất cả sản phẩm trong giỏ hàng");
  };

  const total = useMemo(() => {
    return (items || []).reduce((sum, it) => {
      const price = Number(it?.price || 0);
      const qty = Math.max(0, Number(it?.qty || 0));
      return sum + price * qty;
    }, 0);
  }, [items]);

  const shippingFee = 0;

  const discountAmount = useMemo(() => {
    if (!discount?.percentOff) return 0;
    const pct = Math.max(0, Math.min(100, Number(discount.percentOff || 0)));
    return Math.max(0, Math.round((total * pct) / 100));
  }, [discount?.percentOff, total]);

  const finalTotal = useMemo(() => {
    return Math.max(0, Math.round(total - discountAmount + shippingFee));
  }, [discountAmount, shippingFee, total]);

  useEffect(() => {
    if (!discount) return;
    const min = Number(discount?.minOrderValue || 0);
    if (Number.isFinite(min) && total < min) {
      clearDiscount?.();
      toast?.info?.(`Đã bỏ áp dụng mã (đơn tối thiểu ${formatMoneyVND(min)})`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  useEffect(() => {
    if (items.length > 0) return;
    if (discount) clearDiscount?.();
    setDiscountInput("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  useEffect(() => {
    if (!discount?.code) return;
    setDiscountInput(discount.code);
  }, [discount?.code]);

  const onApplyDiscount = async () => {
    if (applying) return;
    const code = String(discountInput || "").trim().toUpperCase();
    if (!code) {
      toast?.error?.("Vui lòng nhập mã giảm giá");
      return;
    }
    if (!isAuthed) {
      toast?.error?.("Vui lòng đăng nhập để áp mã giảm giá");
      navigate("/login");
      return;
    }
    if (items.length === 0) {
      toast?.error?.("Giỏ hàng trống");
      return;
    }
    if (discount?.code) {
      toast?.info?.("Bạn đã áp dụng một mã giảm giá rồi");
      return;
    }

    try {
      setApplying(true);
      const res = await validateDiscountCodeApi({ code, orderSubtotal: total });
      const data = res?.applied;
      setDiscount(data || { code, percentOff: 0 });
      setDiscountInput((data?.code || code).toUpperCase());
      toast?.success?.("Áp mã giảm giá thành công");
    } catch (err) {
      toast?.error?.(err?.message || "Không thể áp dụng mã giảm giá");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900">
              Giỏ hàng của bạn <span className="text-sm font-medium text-gray-400">({items.length} sản phẩm)</span>
            </div>
          </div>

          {items.length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              className="h-10 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-800 transition-transform duration-150 active:scale-[0.99]"
            >
              Xoá tất cả
            </button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-10 text-center anim-fade-up transition-shadow duration-200 hover:shadow-md">
            <div className="text-sm font-semibold text-gray-900">Giỏ hàng trống</div>
            <div className="mt-1 text-sm text-gray-600">Hãy thêm vài sản phẩm bạn thích.</div>
            <div className="mt-5">
              <Link
                to="/products"
                className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-transform duration-150 active:scale-[0.99]"
              >
                Xem sản phẩm
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden anim-fade-up transition-all duration-200 hover:shadow-md">
                <div className="divide-y divide-gray-100">
                  {items.map((it) => {
                    const qty = Math.max(1, Number(it?.qty || 1));
                    const lineTotal = Math.max(0, Number(it?.price || 0)) * qty;
                    return (
                      <div key={it.productId} className="p-4 flex gap-4 group transition-colors duration-200 hover:bg-gray-50/60">
                        <button
                          type="button"
                          onClick={() => it?.slug && navigate(`/products/${encodeURIComponent(it.slug)}`)}
                          className="w-24 h-24 rounded-xl bg-gray-50 overflow-hidden shrink-0"
                          title="Xem chi tiết"
                        >
                          {it?.imageUrl ? (
                            <img
                              src={it.imageUrl}
                              alt={it?.name || ""}
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                            />
                          ) : null}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => it?.slug && navigate(`/products/${encodeURIComponent(it.slug)}`)}
                                className="text-left text-sm font-bold text-gray-900 hover:text-teal-700 line-clamp-2"
                              >
                                {it?.name || ""}
                              </button>
                              <div className="mt-2 text-sm text-teal-700 font-bold">{formatMoneyVND(it?.price)}</div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemove(it.productId)}
                              className="w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-red-50 flex items-center justify-center transition-transform duration-150 active:scale-[0.99]"
                              title="Xoá"
                            >
                              <Trash2 size={16} className="text-red-600" />
                            </button>
                          </div>

                          <div className="mt-3 flex items-end justify-between gap-3">
                            <div className="inline-flex items-center rounded-xl border border-gray-200 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => incQty?.(it.productId, -1)}
                                className="w-10 h-10 bg-white hover:bg-gray-50 text-gray-700"
                                aria-label="Giảm số lượng"
                              >
                                −
                              </button>
                              <input
                                value={qty}
                                onChange={(e) => setQty?.(it.productId, e.target.value)}
                                className="w-12 h-10 text-center text-sm font-semibold outline-none"
                                inputMode="numeric"
                              />
                              <button
                                type="button"
                                onClick={() => incQty?.(it.productId, 1)}
                                className="w-10 h-10 bg-white hover:bg-gray-50 text-gray-700"
                                aria-label="Tăng số lượng"
                              >
                                +
                              </button>
                            </div>

                            <div className="text-right">
                              <div className="text-xs text-gray-500">Tạm tính</div>
                              <div className="text-sm font-bold text-gray-900">{formatMoneyVND(lineTotal)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Link
                to="/products"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800"
              >
                <span aria-hidden>←</span>
                Tiếp tục mua sắm
              </Link>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 h-fit">
              <div className="text-sm font-bold text-gray-900">Tóm tắt đơn hàng</div>

              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-700">Mã giảm giá</div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                    placeholder="Nhập mã..."
                    className="flex-1 h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-300"
                    disabled={applying || Boolean(discount?.code)}
                  />
                  <button
                    type="button"
                    onClick={onApplyDiscount}
                    className={
                      "h-10 px-4 rounded-xl text-sm font-semibold text-white " +
                      (applying || Boolean(discount?.code) || !discountInput.trim()
                        ? "bg-zinc-900/60 cursor-not-allowed"
                        : "bg-zinc-900 hover:bg-zinc-800")
                    }
                    disabled={applying || Boolean(discount?.code) || !discountInput.trim()}
                  >
                    {applying ? "Đang áp dụng..." : "Áp dụng"}
                  </button>
                  {discount?.code ? (
                    <button
                      type="button"
                      className="h-10 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700"
                      onClick={() => {
                        clearDiscount?.();
                        setDiscountInput("");
                        toast?.info?.("Đã bỏ áp dụng mã giảm giá");
                      }}
                    >
                      Bỏ
                    </button>
                  ) : null}
                </div>
                {discount?.code ? (
                  <div className="mt-2 text-xs text-teal-700 font-semibold">
                    Đã áp dụng: {discount.code} (-{Number(discount.percentOff || 0)}%)
                  </div>
                ) : null}
              </div>

              <div className="mt-5 space-y-2 text-sm">
                <div className="flex items-center justify-between text-gray-700">
                  <span>Tạm tính</span>
                  <span className="font-semibold text-gray-900">{formatMoneyVND(total)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-700">
                  <span>Phí vận chuyển</span>
                  <span className="font-semibold text-teal-700">Miễn phí</span>
                </div>
                {discountAmount > 0 ? (
                  <div className="flex items-center justify-between text-gray-700">
                    <span>Giảm giá</span>
                    <span className="font-semibold text-red-600">- {formatMoneyVND(discountAmount)}</span>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">Tổng cộng</span>
                <span className="text-lg font-extrabold text-teal-700">{formatMoneyVND(finalTotal)}</span>
              </div>

              <button
                type="button"
                className="mt-5 w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold"
                onClick={() => {
                  if (!isAuthed) {
                    toast?.error?.("Vui lòng đăng nhập để thanh toán");
                    navigate("/login");
                    return;
                  }
                  navigate("/checkout");
                }}
              >
                Tiến hành thanh toán
              </button>

              <div className="mt-4 text-xs text-gray-600 space-y-2">
                <div className="flex items-center gap-2">
                  <Truck size={14} className="text-teal-700" />
                  Miễn phí vận chuyển toàn quốc
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-teal-700" />
                  Đổi trả trong 30 ngày
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
