import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ShoppingCart, Star } from "lucide-react";
import { useCartStore } from "../stores/cart.store";
import { useToast } from "../context/useToast";

const formatMoneyVND = (n) => {
  const value = Number(n || 0);
  try {
    return value.toLocaleString("vi-VN") + "đ";
  } catch {
    return String(value) + "đ";
  }
};

const getDisplayPrice = (p) => {
  const original = Number(p?.originalPrice || 0);
  const sale = Number(p?.salePrice || 0);
  const hasSale = Number.isFinite(sale) && sale > 0 && sale < original;
  return { original, sale, hasSale, final: hasSale ? sale : original };
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const StarsRow = ({ value, size = 14 }) => {
  const v = clamp(Number(value || 0), 0, 5);
  return (
    <div className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        const ratio = clamp(v - i, 0, 1);
        return (
          <span key={idx} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="text-gray-300" fill="none" />
            {ratio > 0 ? (
              <span
                className="absolute left-0 top-0 overflow-hidden"
                style={{ width: `${ratio * 100}%`, height: size }}
              >
                <Star size={size} className="text-amber-500" fill="currentColor" />
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
};

const ProductCard = ({ product, showAddToCart = true, onAddToCart, className = "" }) => {
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items || []);
  const toast = useToast();

  const [hovered, setHovered] = useState(false);

  const imageUrl = product?.images?.main?.url || "";
  const { original, sale, hasSale, final } = useMemo(() => getDisplayPrice(product), [product]);

  const discountPct = useMemo(() => {
    if (!hasSale) return 0;
    if (!Number.isFinite(original) || original <= 0) return 0;
    if (!Number.isFinite(sale) || sale <= 0 || sale >= original) return 0;
    const pct = Math.round(((original - sale) / original) * 100);
    return clamp(pct, 1, 99);
  }, [hasSale, original, sale]);

  const ratingAvg = useMemo(() => clamp(Number(product?.ratingAvg || 0), 0, 5), [product]);
  const ratingCount = useMemo(() => Math.max(0, Number(product?.ratingCount || 0)), [product]);
  const qtySold = useMemo(() => Math.max(0, Number(product?.qtySold || 0)), [product?.qtySold]);

  const stockInfo = useMemo(() => {
    const rawStock = Number(product?.stock);
    const hasStock = Number.isFinite(rawStock);
    const stock = hasStock ? Math.max(0, rawStock) : null;
    const productId = String(product?.id || "");
    const inCartQty = productId
      ? Math.max(0, Number((cartItems || []).find((x) => String(x?.productId || "") === productId)?.qty || 0))
      : 0;
    const available = hasStock ? Math.max(0, stock - inCartQty) : null;
    return { hasStock, stock, inCartQty, available };
  }, [product?.id, product?.stock, cartItems]);

  const handleAdd = () => {
    if (stockInfo?.hasStock) {
      if ((stockInfo.stock || 0) <= 0) {
        toast?.error?.("Sản phẩm đã hết hàng");
        return;
      }
      if ((stockInfo.available || 0) <= 0) {
        toast?.error?.("Bạn đã có tối đa số lượng tồn kho trong giỏ hàng.");
        return;
      }
    }

    const payload = {
      productId: product?.id,
      slug: product?.slug,
      name: product?.name,
      price: final,
      imageUrl,
      qty: 1,
    };

    if (typeof onAddToCart === "function") {
      onAddToCart(payload);
      return;
    }

    addItem?.(payload);
    toast?.success?.("Đã thêm vào giỏ hàng");
  };

  return (
    <div
      className={
        "group rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col h-full " +
        className
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product?.name || ""}
            className="w-full h-full object-cover object-center transition-transform duration-200 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
        )}

        {discountPct > 0 ? (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-rose-500 text-white text-[11px] font-extrabold shadow-sm">
              GIẢM {discountPct}%
            </span>
          </div>
        ) : null}

        <div
          className={
            "absolute top-3 right-3 flex flex-col gap-2 transition-all duration-200 " +
            (hovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none")
          }
        >
          <button
            type="button"
            aria-label="Xem chi tiết"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(`/products/${encodeURIComponent(product?.slug || "")}`);
            }}
            className="w-10 h-10 rounded-full bg-white/90 border border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm flex items-center justify-center"
          >
            <Eye size={18} />
          </button>

          {showAddToCart ? (
            <button
              type="button"
              aria-label="Thêm vào giỏ hàng"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAdd();
              }}
              className="w-10 h-10 rounded-full bg-white/90 border border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm flex items-center justify-center"
            >
              <ShoppingCart size={18} />
            </button>
          ) : null}
        </div>

        {showAddToCart ? (
          <div
            className={
              "absolute inset-x-4 bottom-4 transition-all duration-200 " +
              (hovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none")
            }
          >
            <button
              type="button"
              onClick={handleAdd}
              className="w-full h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
            >
              <ShoppingCart size={16} />
              Thêm vào giỏ
            </button>
          </div>
        ) : null}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <button
          type="button"
          onClick={() => navigate(`/products/${encodeURIComponent(product?.slug || "")}`)}
          className="text-left text-sm font-semibold text-gray-900 hover:text-teal-700 line-clamp-2 min-h-[40px]"
          title={product?.name || ""}
        >
          {product?.name || ""}
        </button>

        <div className="mt-3 flex items-end gap-2">
          {hasSale ? (
            <>
              <div className="text-base font-bold text-teal-700">{formatMoneyVND(final)}</div>
              <div className="text-xs text-gray-400 line-through pb-0.5">{formatMoneyVND(original)}</div>
            </>
          ) : (
            <div className="text-base font-bold text-teal-700">{formatMoneyVND(original)}</div>
          )}
        </div>

        <div className="mt-auto pt-3 flex items-center justify-between text-xs text-gray-500 min-h-[18px]">
          <div className="flex items-center gap-2">
            <StarsRow value={ratingAvg} />
            <span>({ratingCount})</span>
          </div>

          <div className="whitespace-nowrap">Đã bán {qtySold.toLocaleString("vi-VN")}</div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
