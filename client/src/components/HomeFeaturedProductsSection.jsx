import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { listProductsApi } from "../services/product.api";
import ProductCard from "./ProductCard";
import { useCartStore } from "../stores/cart.store";
import { useToast } from "../context/useToast";

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "featured", label: "Nổi bật" },
  { key: "newest", label: "Mới nhất" },
  { key: "discount", label: "Giảm giá" },
];

const getDiscountRatio = (p) => {
  const original = Number(p?.originalPrice || 0);
  const sale = Number(p?.salePrice || 0);
  if (!Number.isFinite(original) || original <= 0) return 0;
  if (!Number.isFinite(sale) || sale <= 0 || sale >= original) return 0;
  return (original - sale) / original;
};

const HomeFeaturedProductsSection = ({ toast }) => {
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const toastCtx = useToast();
  const toastApi = toast || toastCtx;
  const [tab, setTab] = useState("all");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);

  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await listProductsApi({ page: 1, limit: 50, includeHidden: false, sort: "new" });
        if (!mounted) return;
        setProducts(Array.isArray(res?.items) ? res.items : []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Không thể tải sản phẩm");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    if (tab === "featured") {
      return [...list]
        .sort((a, b) => {
          const ra = Number(a?.ratingAvg || 0);
          const rb = Number(b?.ratingAvg || 0);
          if (rb !== ra) return rb - ra;
          const ca = Number(a?.ratingCount || 0);
          const cb = Number(b?.ratingCount || 0);
          if (cb !== ca) return cb - ca;
          return String(b?.createdAt || "").localeCompare(String(a?.createdAt || ""));
        })
        .slice(0, 8);
    }

    if (tab === "newest") {
      return [...list]
        .sort((a, b) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || "")))
        .slice(0, 8);
    }

    if (tab === "discount") {
      return list
        .filter((p) => getDiscountRatio(p) > 0)
        .sort((a, b) => getDiscountRatio(b) - getDiscountRatio(a))
        .slice(0, 8);
    }

    return list.slice(0, 8);
  }, [products, tab]);

  useEffect(() => {
    if (loading) return;
    setAnimKey((k) => k + 1);
  }, [loading, tab, filtered.length]);

  const handleAddToCart = (payload) => {
    addItem?.(payload);
    toastApi?.success?.("Đã thêm vào giỏ hàng");
  };

  return (
    <section className="py-16">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-[11px] tracking-[0.26em] font-semibold text-teal-500">FEATURED PRODUCTS</div>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-gray-900">
            Sản phẩm <span className="text-teal-500">được yêu thích</span> nhất
          </h2>
        </div>

        <button
          type="button"
          onClick={() => navigate("/products")}
          className="shrink-0 h-10 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 flex items-center gap-2"
        >
          Xem tất cả
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              "h-9 px-4 rounded-full text-sm font-semibold transition border " +
              (tab === t.key
                ? "bg-teal-600 border-teal-600 text-white"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {error ? (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="aspect-[4/3] rounded-xl bg-gray-100 animate-pulse" />
                <div className="mt-4 h-4 w-5/6 bg-gray-100 rounded animate-pulse" />
                <div className="mt-2 h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div key={animKey} className={loading ? "" : "anim-fade-up"}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>

            {!filtered.length && !error ? (
              <div className="mt-6 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-3">
                Chưa có sản phẩm để hiển thị. Hãy thêm sản phẩm trong Admin hoặc chạy seed dữ liệu demo.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
};

export default HomeFeaturedProductsSection;
