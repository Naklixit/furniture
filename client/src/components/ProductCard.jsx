import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
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

const ProductCard = ({ product, showAddToCart = true, onAddToCart, className = "" }) => {
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();

  const [hovered, setHovered] = useState(false);

  const imageUrl = product?.images?.main?.url || "";
  const { original, sale, hasSale, final } = useMemo(() => getDisplayPrice(product), [product]);

  const handleAdd = () => {
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
        <button
          type="button"
          onClick={() => navigate(`/products/${encodeURIComponent(product?.slug || "")}`)}
          className="text-left text-sm font-semibold text-gray-900 hover:text-teal-700 line-clamp-2"
          title={product?.name || ""}
        >
          {product?.name || ""}
        </button>

        <div className="mt-3 flex items-end gap-2">
          <div className="text-base font-extrabold text-gray-900">{formatMoneyVND(final)}</div>
          {hasSale ? (
            <div className="text-xs text-gray-400 line-through pb-0.5">{formatMoneyVND(original)}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
