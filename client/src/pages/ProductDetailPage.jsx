import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { BadgeCheck, Truck, RotateCcw, ShoppingCart, Star } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { getProductBySlugApi } from "../services/product.api";
import { listProductReviewsApi } from "../services/review.api";
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

const toPlainObject = (value) => {
  if (!value) return {};
  if (typeof value !== "object") return {};
  if (Array.isArray(value)) return {};
  return value;
};

const buildCategoryUrl = (p) => {
  const id = p?.category?.id || p?.categoryId || "";
  const name = p?.category?.name || "";
  if (!id) return "/products";
  const sp = new URLSearchParams();
  sp.set("categoryId", String(id));
  if (name) sp.set("category", String(name));
  return `/products?${sp.toString()}`;
};

const formatDimensions = (dims) => {
  const d = dims || {};
  const l = Number(d.length || 0);
  const w = Number(d.width || 0);
  const h = Number(d.height || 0);
  const unit = String(d.unit || "cm");
  return `${l} x ${w} x ${h} ${unit}`;
};

const formatWeight = (weight) => {
  const w = weight || {};
  const v = Number(w.value || 0);
  const unit = String(w.unit || "kg");
  return `${v} ${unit}`;
};

export default function ProductDetailPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();

  const [animKey, setAnimKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [product, setProduct] = useState(null);
  const [activeUrl, setActiveUrl] = useState("");
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState("desc");
  const [tabPanelKey, setTabPanelKey] = useState(0);

  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [reviews, setReviews] = useState([]);
  const [reviewsMeta, setReviewsMeta] = useState({ page: 1, limit: 6, total: 0, totalPages: 1 });

  const setTabAndUrl = (nextTab) => {
    const t = nextTab === "reviews" ? "reviews" : "desc";
    setTab(t);
    const sp = new URLSearchParams(searchParams);
    if (t === "reviews") sp.set("tab", "reviews");
    else sp.delete("tab");
    setSearchParams(sp, { replace: true, preventScrollReset: true });
  };

  useEffect(() => {
    setAnimKey((k) => k + 1);

    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getProductBySlugApi(slug);
        const p = res?.product || null;
        if (!mounted) return;
        setProduct(p);
        setQty(1);

        try {
          const sp = new URLSearchParams(window.location.search);
          const t = (sp.get("tab") || "").toLowerCase();
          setTab(t === "reviews" ? "reviews" : "desc");
        } catch {
          setTab("desc");
        }

        const main = p?.images?.main?.url || "";
        const firstGallery = Array.isArray(p?.images?.gallery) ? p.images.gallery[0]?.url : "";
        setActiveUrl(main || firstGallery || "");

        setReviews([]);
        setReviewsMeta({ page: 1, limit: 6, total: 0, totalPages: 1 });
        setReviewsError("");
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || e?.response?.data?.message || "Không thể tải sản phẩm");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    if (!slug) {
      setLoading(false);
      setError("Thiếu slug sản phẩm");
      return;
    }

    run();
    return () => {
      mounted = false;
    };
  }, [slug]);

  useEffect(() => {
    setTabPanelKey((k) => k + 1);
  }, [tab]);

  const fetchReviews = async ({ page, append }) => {
    const productId = product?.id;
    if (!productId) return;
    if (reviewsLoading) return;

    try {
      setReviewsLoading(true);
      setReviewsError("");
      const res = await listProductReviewsApi(productId, { page, limit: reviewsMeta.limit });
      const items = Array.isArray(res?.items) ? res.items : [];
      const meta = res?.meta || {};
      setReviewsMeta({
        page: Number(meta.page || page),
        limit: Number(meta.limit || reviewsMeta.limit),
        total: Number(meta.total || 0),
        totalPages: Number(meta.totalPages || 1),
      });
      setReviews((prev) => (append ? [...prev, ...items] : items));
    } catch (e) {
      setReviewsError(e?.message || "Không thể tải đánh giá");
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== "reviews") return;
    if (!product?.id) return;
    if (reviews.length) return;
    fetchReviews({ page: 1, append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, product?.id]);

  const images = useMemo(() => {
    const list = [];
    const main = product?.images?.main;
    if (main?.url) list.push({ url: main.url, publicId: main.publicId || main.url });

    const gallery = Array.isArray(product?.images?.gallery) ? product.images.gallery : [];
    gallery.forEach((g) => {
      if (!g?.url) return;
      list.push({ url: g.url, publicId: g.publicId || g.url });
    });

    const seen = new Set();
    return list.filter((it) => {
      const key = String(it.publicId || it.url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [product]);

  const price = useMemo(() => getDisplayPrice(product), [product]);

  const stock = useMemo(() => Math.max(0, Number(product?.stock || 0)), [product]);
  const inStock = stock > 0;
  const canDecrease = qty > 1;
  const canIncrease = inStock ? qty < stock : false;

  const extraSpecsEntries = useMemo(() => {
    const extra = toPlainObject(product?.specs?.extra);
    return Object.entries(extra)
      .map(([k, v]) => [String(k).trim(), v == null ? "" : String(v).trim()])
      .filter(([k, v]) => k && v);
  }, [product]);

  const handleAddToCart = () => {
    if (!product?.id) return;
    if (!inStock) {
      toast?.error?.("Sản phẩm đã hết hàng");
      return;
    }
    const mainUrl = product?.images?.main?.url || images[0]?.url || "";

    addItem?.({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: price.final,
      imageUrl: mainUrl,
      qty: Math.max(1, Math.min(Number(qty || 1), stock || 1)),
    });

    toast?.success?.("Đã thêm vào giỏ hàng");
  };

  const ratingAvg = useMemo(() => {
    const v = Number(product?.ratingAvg || 0);
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(5, v));
  }, [product]);

  const ratingCount = useMemo(() => Math.max(0, Number(product?.ratingCount || 0)), [product]);

  const StarsRow = ({ value, size = 16 }) => {
    const v = Math.max(0, Math.min(5, Number(value || 0)));
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-1">
        <div key={animKey} className="anim-fade-up">
          <div className="text-sm text-gray-600">
            <Link to="/products" className="hover:text-teal-700">
              Sản phẩm
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-semibold">{product?.name || "Chi tiết"}</span>
          </div>

        {loading ? (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
              <div className="aspect-[4/3] bg-gray-100 animate-pulse" />
              <div className="p-4 flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-16 h-16 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-gray-200 p-6">
              <div className="h-6 w-2/3 bg-gray-100 rounded animate-pulse" />
              <div className="mt-4 h-5 w-1/3 bg-gray-100 rounded animate-pulse" />
              <div className="mt-6 h-10 w-40 bg-gray-100 rounded-xl animate-pulse" />
              <div className="mt-8 h-20 w-full bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-red-100 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        ) : !product ? (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white text-gray-700 px-4 py-3 text-sm">
            Không có dữ liệu sản phẩm.
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden self-start">
              <div className="relative aspect-[4/3] bg-gray-50">
                {activeUrl ? (
                  <img src={activeUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
                )}
              </div>

              {images.length > 1 ? (
                <div className="p-4 flex gap-2 overflow-x-auto">
                  {images.map((it) => {
                    const isActive = it.url === activeUrl;
                    return (
                      <button
                        key={it.publicId}
                        type="button"
                        onClick={() => {
                          setActiveUrl(it.url);
                        }}
                        className={
                          "w-16 h-16 rounded-xl border overflow-hidden shrink-0 bg-gray-50 " +
                          (isActive ? "border-teal-600 ring-2 ring-teal-100" : "border-gray-200 hover:border-gray-300")
                        }
                        title="Xem ảnh"
                      >
                        <img src={it.url} alt={product.name} className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

              <div className="rounded-2xl bg-white border border-gray-200 p-6">
                <div className="text-sm text-gray-500 flex items-center gap-3">
                  {product.brand ? (
                    <span className="font-semibold text-gray-700">{product.brand}</span>
                  ) : null}
                  {product.category?.name ? (
                    <Link to={buildCategoryUrl(product)} className="text-teal-700 hover:text-teal-800 font-semibold">
                      {product.category.name}
                    </Link>
                  ) : null}
                </div>

                <div className="mt-2 text-2xl md:text-3xl font-extrabold text-gray-900">{product.name}</div>

                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <StarsRow value={ratingAvg} />
                  <span className="font-semibold text-gray-900">{ratingAvg ? ratingAvg.toFixed(1) : "0.0"}/5</span>
                  <span className="text-gray-400">•</span>
                  <button
                    type="button"
                    onClick={() => setTabAndUrl("reviews")}
                    className="text-teal-700 hover:text-teal-800 font-semibold"
                    title="Xem đánh giá"
                  >
                    {ratingCount} đánh giá
                  </button>
                </div>

                <div className="mt-4">
                  <div className="text-3xl font-extrabold text-teal-700">{formatMoneyVND(price.final)}</div>
                  {price.hasSale ? (
                    <div className="mt-1 text-sm text-gray-500">
                      Giá gốc: <span className="line-through">{formatMoneyVND(price.original)}</span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 space-y-3 text-sm text-gray-700">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-gray-500">Kích thước</span>
                    <span className="font-semibold text-gray-900">
                      {product?.specs?.dimensions ? formatDimensions(product.specs.dimensions) : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-gray-500">Trọng lượng</span>
                    <span className="font-semibold text-gray-900">
                      {product?.specs?.weight ? formatWeight(product.specs.weight) : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-gray-500">Tồn kho</span>
                    {inStock ? (
                      <span className="font-semibold text-emerald-700">Còn hàng ({stock} sản phẩm)</span>
                    ) : (
                      <span className="font-semibold text-red-600">Hết hàng</span>
                    )}
                  </div>
                </div>

                <div className="mt-7">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-gray-600">Số lượng:</div>
                    <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden">
                      <button
                        type="button"
                        className={
                          "w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition " +
                          (!canDecrease ? "opacity-40 cursor-not-allowed" : "")
                        }
                        disabled={!canDecrease}
                        onClick={() => setQty((q) => Math.max(1, Number(q || 1) - 1))}
                        aria-label="Giảm số lượng"
                      >
                        -
                      </button>
                      <div className="w-12 h-10 flex items-center justify-center text-sm font-bold text-gray-900 border-x border-gray-200">
                        {qty}
                      </div>
                      <button
                        type="button"
                        className={
                          "w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition " +
                          (!canIncrease ? "opacity-40 cursor-not-allowed" : "")
                        }
                        disabled={!canIncrease}
                        onClick={() => setQty((q) => Math.min(stock || 1, Number(q || 1) + 1))}
                        aria-label="Tăng số lượng"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!inStock}
                    className={
                      "mt-4 w-full h-12 rounded-2xl text-white text-sm font-semibold shadow-sm transition flex items-center justify-center gap-2 " +
                      (inStock ? "bg-teal-600 hover:bg-teal-700" : "bg-gray-300 cursor-not-allowed")
                    }
                  >
                    <ShoppingCart size={18} />
                    Thêm vào giỏ hàng
                  </button>

                  <div className="mt-5 rounded-2xl bg-gray-50 border border-gray-100 p-4 grid grid-cols-3 gap-3">
                    <div className="flex flex-col items-center justify-center gap-2 text-[11px] text-gray-700">
                      <BadgeCheck size={18} className="text-teal-600" />
                      Hàng chính hãng 100%
                    </div>
                    <div className="flex flex-col items-center justify-center gap-2 text-[11px] text-gray-700">
                      <Truck size={18} className="text-teal-600" />
                      Miễn phí vận chuyển
                    </div>
                    <div className="flex flex-col items-center justify-center gap-2 text-[11px] text-gray-700">
                      <RotateCcw size={18} className="text-teal-600" />
                      Đổi trả trong 30 ngày
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-6 pt-4 flex items-center gap-6 border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => setTabAndUrl("desc")}
                  className={
                    "pb-3 text-sm font-semibold transition " +
                    (tab === "desc" ? "text-teal-700 border-b-2 border-teal-600" : "text-gray-600 hover:text-gray-900")
                  }
                >
                  Mô tả sản phẩm
                </button>
                <button
                  type="button"
                  onClick={() => setTabAndUrl("reviews")}
                  className={
                    "pb-3 text-sm font-semibold transition " +
                    (tab === "reviews" ? "text-teal-700 border-b-2 border-teal-600" : "text-gray-600 hover:text-gray-900")
                  }
                >
                  Đánh giá ({Math.max(0, Number(product?.ratingCount || 0))})
                </button>
              </div>

              <div className="p-6">
                <div key={tabPanelKey} className="anim-fade-up">
                  {tab === "reviews" ? (
                    <div>
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <div className="text-sm font-bold text-gray-900">Đánh giá sản phẩm</div>
                          <div className="mt-1 text-sm text-gray-600">Tổng cộng {ratingCount} đánh giá</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-3xl font-extrabold text-gray-900">{ratingAvg ? ratingAvg.toFixed(1) : "0.0"}</div>
                          <div>
                            <StarsRow value={ratingAvg} size={18} />
                            <div className="mt-1 text-xs text-gray-500">Trung bình / 5 sao</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      {reviewsLoading && !reviews.length ? (
                        <div className="text-sm text-gray-500">Đang tải đánh giá...</div>
                      ) : reviewsError ? (
                        <div className="text-sm text-red-600">{reviewsError}</div>
                      ) : !reviews.length ? (
                        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
                          <div className="text-sm font-semibold text-gray-900">Chưa có đánh giá</div>
                          <div className="mt-1 text-sm text-gray-600">Hãy là người đầu tiên chia sẻ trải nghiệm của bạn.</div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {reviews.map((r) => (
                            <div
                              key={String(r?.id || Math.random())}
                              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="text-sm font-bold text-gray-900 truncate">{r?.user?.fullName || "Khách hàng"}</div>
                                  <div className="mt-1 flex items-center gap-2">
                                    <StarsRow value={Number(r?.rating || 0)} size={16} />
                                    <span className="text-xs text-gray-500">
                                      {r?.createdAt ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(r.createdAt)) : ""}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-xs font-semibold text-gray-700">{Number(r?.rating || 0)}/5</div>
                              </div>

                              <div className="mt-3 text-sm text-gray-700 whitespace-pre-line">{r?.content || ""}</div>

                              {Array.isArray(r?.images) && r.images.length ? (
                                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  {r.images.slice(0, 4).map((img) => (
                                    <a
                                      key={img.publicId || img.url}
                                      href={img.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block rounded-2xl border border-gray-200 overflow-hidden bg-gray-50 hover:shadow-sm transition"
                                      title="Mở ảnh"
                                    >
                                      <img src={img.url} alt="" className="w-full h-24 object-cover" />
                                    </a>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ))}

                          {reviewsMeta.page < reviewsMeta.totalPages ? (
                            <div className="pt-2 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => fetchReviews({ page: reviewsMeta.page + 1, append: true })}
                                disabled={reviewsLoading}
                                className={
                                  "h-10 px-5 rounded-xl border text-sm font-semibold transition-transform duration-150 active:scale-[0.99] " +
                                  (reviewsLoading
                                    ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50")
                                }
                              >
                                {reviewsLoading ? "Đang tải..." : "Xem thêm"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                  ) : (
                    <>
                    <div className="text-sm text-gray-700 whitespace-pre-line">
                      {product.description ? product.description : "Chưa có mô tả."}
                    </div>

                    <div className="mt-8">
                      <div className="text-sm font-bold text-gray-900">Thông số chi tiết</div>
                      <div className="mt-3 overflow-hidden rounded-xl border border-gray-100">
                        <div className="divide-y divide-gray-100">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 py-3">
                            <div className="text-sm text-gray-500">Danh mục</div>
                            <div className="sm:col-span-2 text-sm font-semibold text-gray-900">
                              {product?.category?.name || "-"}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 py-3">
                            <div className="text-sm text-gray-500">Thương hiệu</div>
                            <div className="sm:col-span-2 text-sm font-semibold text-gray-900">
                              {product?.brand || "-"}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 py-3">
                            <div className="text-sm text-gray-500">Kích thước</div>
                            <div className="sm:col-span-2 text-sm font-semibold text-gray-900">
                              {product?.specs?.dimensions ? formatDimensions(product.specs.dimensions) : "-"}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 py-3">
                            <div className="text-sm text-gray-500">Trọng lượng</div>
                            <div className="sm:col-span-2 text-sm font-semibold text-gray-900">
                              {product?.specs?.weight ? formatWeight(product.specs.weight) : "-"}
                            </div>
                          </div>

                          {extraSpecsEntries.map(([k, v]) => (
                            <div key={k} className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 py-3">
                              <div className="text-sm text-gray-500">{k}</div>
                              <div className="sm:col-span-2 text-sm font-semibold text-gray-900">{v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
