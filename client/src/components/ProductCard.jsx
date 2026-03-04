import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Star } from "lucide-react";
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
        const active = v >= idx - 0.35;
        return (
          <Star
            key={idx}
            size={size}
            className={active ? "text-amber-500" : "text-gray-300"}
            fill={active ? "currentColor" : "none"}
          />
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
        "group rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition overflow-hidden " +
        className
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative aspect-[4/3] bg-gray-50">
        {imageUrl ? (
          <img src={imageUrl} alt={product?.name || ""} className="w-full h-full object-cover" />
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

      <div className="p-4">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <StarsRow value={ratingAvg} />
          <span>({ratingCount})</span>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/products/${encodeURIComponent(product?.slug || "")}`)}
          className="mt-2 text-left text-sm font-semibold text-gray-900 hover:text-teal-700 line-clamp-2"
          title={product?.name || ""}
        >
          {product?.name || ""}
        </button>

        <div className="mt-3 flex items-end gap-2">
          <div className="text-base font-bold text-gray-900">{formatMoneyVND(final)}</div>
          {hasSale ? (
            <div className="text-xs text-gray-400 line-through pb-0.5">{formatMoneyVND(original)}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
