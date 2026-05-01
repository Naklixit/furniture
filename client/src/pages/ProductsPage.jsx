import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import { listProductsApi } from "../services/product.api";
import { listCategoriesApi } from "../services/category.api";
import ProductsFiltersPanel from "./products/ProductsFiltersPanel";

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const PRICE_MIN = 0;
const PRICE_MAX = 50_000_000;
const PRODUCTS_PER_PAGE = 12;

const parseBoolParam = (v) => String(v || "").toLowerCase() === "true";

const uniqStrings = (arr) => {
  const seen = new Set();
  const out = [];
  (arr || []).forEach((x) => {
    const s = String(x || "").trim();
    if (!s) return;
    const key = s.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(s);
  });
  return out;
};

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [typing, setTyping] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");
  const [categories, setCategories] = useState([]);
  const [resultsAnimKey, setResultsAnimKey] = useState(0);
  const [pageAnimKey, setPageAnimKey] = useState(0);

  const categoryName = useMemo(() => {
    const v = searchParams.get("category") || "";
    return String(v).trim();
  }, [searchParams]);

  const categoryId = useMemo(() => {
    const v = searchParams.get("categoryId") || "";
    return String(v).trim();
  }, [searchParams]);

  const q = useMemo(() => {
    const v = searchParams.get("q") || "";
    return String(v).trim();
  }, [searchParams]);

  const minPrice = useMemo(() => {
    const v = searchParams.get("minPrice") || "";
    return String(v).trim();
  }, [searchParams]);

  const minPriceNum = useMemo(() => {
    if (!minPrice) return PRICE_MIN;
    const n = Number(minPrice);
    if (!Number.isFinite(n)) return PRICE_MIN;
    return clamp(Math.floor(n), PRICE_MIN, PRICE_MAX);
  }, [minPrice]);

  const maxPrice = useMemo(() => {
    const v = searchParams.get("maxPrice") || "";
    return String(v).trim();
  }, [searchParams]);

  const maxPriceNum = useMemo(() => {
    if (!maxPrice) return PRICE_MAX;
    const n = Number(maxPrice);
    if (!Number.isFinite(n)) return PRICE_MAX;
    return clamp(Math.floor(n), PRICE_MIN, PRICE_MAX);
  }, [maxPrice]);

  const brands = useMemo(() => {
    const v = searchParams.get("brands") || "";
    return String(v).trim();
  }, [searchParams]);

  const brandsArr = useMemo(() => {
    if (!brands) return [];
    return uniqStrings(brands.split(",").map((s) => s.trim())).slice(0, 20);
  }, [brands]);

  const inStock = useMemo(() => parseBoolParam(searchParams.get("inStock")), [searchParams]);
  const onSale = useMemo(() => parseBoolParam(searchParams.get("onSale")), [searchParams]);

  const minRating = useMemo(() => {
    const raw = searchParams.get("minRating");
    if (raw === null || raw === undefined || String(raw).trim() === "") return "";
    const n = Number(raw);
    if (!Number.isFinite(n)) return "";
    return String(clamp(Math.floor(n), 3, 5));
  }, [searchParams]);

  const page = useMemo(() => {
    const raw = Number(searchParams.get("page") || 1);
    if (!Number.isFinite(raw) || raw <= 0) return 1;
    return Math.floor(raw);
  }, [searchParams]);

  const sort = useMemo(() => {
    const v = String(searchParams.get("sort") || "new");
    if (v === "relevance" || v === "price_asc" || v === "price_desc" || v === "new") return v;
    return "new";
  }, [searchParams]);

  const [filterDraft, setFilterDraft] = useState({
    categoryId: "",
    minPrice: PRICE_MIN,
    maxPrice: PRICE_MAX,
    brands: [],
    inStock: false,
    onSale: false,
    minRating: "",
  });

  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  useEffect(() => {
    setPageAnimKey((k) => k + 1);
  }, []);

  useEffect(() => {
    setFilterDraft({
      categoryId,
      minPrice: Math.min(minPriceNum, maxPriceNum),
      maxPrice: Math.max(minPriceNum, maxPriceNum),
      brands: brandsArr,
      inStock,
      onSale,
      minRating,
    });
  }, [categoryId, minPriceNum, maxPriceNum, brandsArr, inStock, onSale, minRating]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setCategoriesLoading(true);
        setCategoriesError("");
        const res = await listCategoriesApi({ page: 1, limit: 100, includeHidden: false });
        if (!mounted) return;
        setCategories(Array.isArray(res?.items) ? res.items : []);
      } catch (e) {
        if (!mounted) return;
        setCategoriesError(e?.message || "Không thể tải danh mục");
        setCategories([]);
      } finally {
        if (!mounted) return;
        setCategoriesLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await listProductsApi({
          search: q,
          page,
          limit: PRODUCTS_PER_PAGE,
          categoryId,
          minPrice,
          maxPrice,
          brands,
          inStock,
          onSale,
          minRating,
          includeHidden: false,
          sort,
        });
        if (!mounted) return;
        setItems(Array.isArray(res?.items) ? res.items : []);
        setMeta(res?.meta || null);
        setResultsAnimKey((k) => k + 1);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Không thể tải danh sách sản phẩm");
        setItems([]);
        setMeta(null);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [q, page, categoryId, sort, minPrice, maxPrice, brands, inStock, onSale, minRating]);

  const updateParams = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || String(v).trim() === "") next.delete(k);
      else next.set(k, String(v));
    });
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    const nextQ = searchDraft.trim();
    if (nextQ === q) {
      setTyping(false);
      return undefined;
    }

    setTyping(true);
    const t = setTimeout(() => {
      updateParams({ q: nextQ, page: 1 });
      setTyping(false);
    }, 320);

    return () => clearTimeout(t);
  }, [searchDraft, q]);

  const onChangeSort = (nextSort) => {
    updateParams({ sort: nextSort, page: 1 });
  };

  const categoryLabel = useMemo(() => {
    if (categoryName) return categoryName;
    const found = (categories || []).find((c) => String(c?.id || "") === String(categoryId || ""));
    return found?.name || "";
  }, [categoryName, categories, categoryId]);

  const [brandsPool, setBrandsPool] = useState([]);
  useEffect(() => {
    const fromItems = uniqStrings((items || []).map((p) => p?.brand || "").filter(Boolean));
    setBrandsPool((prev) => uniqStrings([...(prev || []), ...fromItems]));
  }, [items]);

  const availableBrands = useMemo(() => {
    const merged = uniqStrings([...(brandsPool || []), ...(brandsArr || [])]);
    return merged.sort((a, b) => a.localeCompare(b, "vi"));
  }, [brandsPool, brandsArr]);

  const applyFilters = () => {
    const selectedCategory = String(filterDraft.categoryId || "").trim();
    const catName = (categories || []).find((c) => String(c?.id || "") === selectedCategory)?.name || "";

    const draftMin = clamp(Number(filterDraft.minPrice ?? PRICE_MIN), PRICE_MIN, PRICE_MAX);
    const draftMax = clamp(Number(filterDraft.maxPrice ?? PRICE_MAX), PRICE_MIN, PRICE_MAX);
    const safeMin = Math.min(draftMin, draftMax);
    const safeMax = Math.max(draftMin, draftMax);

    updateParams({
      categoryId: selectedCategory,
      category: selectedCategory ? catName : "",
      minPrice: safeMin <= PRICE_MIN ? "" : String(safeMin),
      maxPrice: safeMax >= PRICE_MAX ? "" : String(safeMax),
      brands: (filterDraft.brands || []).join(","),
      inStock: filterDraft.inStock ? "true" : "",
      onSale: filterDraft.onSale ? "true" : "",
      minRating: String(filterDraft.minRating || "").trim(),
      page: 1,
    });
    setFiltersOpen(false);
  };

  const clearFilters = () => {
    setFilterDraft({
      categoryId: "",
      minPrice: PRICE_MIN,
      maxPrice: PRICE_MAX,
      brands: [],
      inStock: false,
      onSale: false,
      minRating: "",
    });
    updateParams({
      categoryId: "",
      category: "",
      minPrice: "",
      maxPrice: "",
      brands: "",
      inStock: "",
      onSale: "",
      minRating: "",
      sort: "",
      page: 1,
    });
    setFiltersOpen(false);
  };

  const totalPages = useMemo(() => Math.max(1, Number(meta?.totalPages || 1)), [meta?.totalPages]);
  const currentPage = useMemo(() => Math.max(1, Math.min(page, totalPages)), [page, totalPages]);
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const goToPage = (p) => {
    const nextPage = Math.max(1, Math.min(Number(p) || 1, totalPages));
    updateParams({ page: nextPage });
  };

  const goPrev = () => {
    if (!canPrev) return;
    goToPage(currentPage - 1);
  };

  const goNext = () => {
    if (!canNext) return;
    goToPage(currentPage + 1);
  };

  const pageButtons = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    const normalized = Array.from(pages)
      .filter((p) => p >= 1 && p <= totalPages)
      .sort((a, b) => a - b);

    const out = [];
    for (let i = 0; i < normalized.length; i++) {
      const p = normalized[i];
      const prev = normalized[i - 1];
      if (i > 0 && p - prev > 1) out.push("...");
      out.push(p);
    }
    return out;
  }, [totalPages, currentPage]);

  return (
    <div key={pageAnimKey} className="min-h-screen bg-gray-50 flex flex-col anim-fade-up">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-2xl md:text-3xl font-extrabold text-gray-900">Sản phẩm</div>
            <div className="mt-2 text-sm text-gray-600 truncate">
              {categoryLabel ? (
                <>
                  Danh mục: <span className="font-semibold text-gray-900">{categoryLabel}</span>
                </>
              ) : q ? (
                <>
                  Kết quả tìm kiếm cho: <span className="font-semibold text-gray-900">{q}</span>
                </>
              ) : (
                "Khám phá các sản phẩm mới nhất."
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="lg:hidden h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 inline-flex items-center gap-2"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal size={16} />
              Lọc
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col lg:flex-row gap-6">
          <aside className="hidden lg:block w-[310px] shrink-0">
            <ProductsFiltersPanel
              categoriesLoading={categoriesLoading}
              categoriesError={categoriesError}
              categories={categories}
              availableBrands={availableBrands}
              draft={filterDraft}
              setDraft={setFilterDraft}
              onApply={applyFilters}
              onClear={clearFilters}
            />
          </aside>

          <section className="flex-1 min-w-0">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Tìm kiếm sản phẩm, thương hiệu..."
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-gray-300"
                />
              </div>
              <button
                type="button"
                className={
                  "h-11 px-5 rounded-xl text-white text-sm font-semibold transition " +
                  (typing ? "bg-teal-500" : "bg-teal-600 hover:bg-teal-700")
                }
                onClick={() => updateParams({ q: searchDraft.trim(), page: 1 })}
              >
                {typing ? "Đang lọc..." : "Tìm kiếm"}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(
                [
                  { key: "new", label: "Mới nhất" },
                  { key: "price_asc", label: "Giá tăng dần" },
                  { key: "price_desc", label: "Giá giảm dần" },
                ]
              ).map((opt) => {
                const active = sort === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => onChangeSort(opt.key)}
                    className={
                      "h-9 px-4 rounded-full border text-sm font-semibold inline-flex items-center gap-2 " +
                      (active
                        ? "border-teal-600 text-teal-700 bg-white"
                        : "border-gray-200 text-gray-700 bg-white hover:bg-gray-50")
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {error ? (
              <div className="mt-8 rounded-2xl border border-red-100 bg-red-50 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            ) : null}

            <div key={resultsAnimKey} className={!loading && !error ? "anim-fade-up" : ""}>
              {loading && items.length > 0 ? (
                <div className="mt-6 text-sm text-gray-500">Đang tải...</div>
              ) : null}

              <div
                className={
                  "mt-8 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5 auto-rows-fr transition-opacity " +
                  (loading && items.length > 0 ? "opacity-60" : "opacity-100")
                }
              >
                {loading && items.length === 0
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                        <div className="aspect-[4/3] bg-gray-100 animate-pulse" />
                        <div className="p-4">
                          <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                          <div className="mt-3 h-5 w-1/2 bg-gray-100 rounded animate-pulse" />
                        </div>
                      </div>
                    ))
                  : items.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>

            {!loading && !error && items.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
                Không có sản phẩm phù hợp.
              </div>
            ) : null}

            {meta && meta.totalPages > 1 ? (
              <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={!canPrev}
                  className={
                    "h-10 px-4 rounded-xl border text-sm font-semibold " +
                    (canPrev
                      ? "border-gray-200 bg-white hover:bg-gray-50 text-gray-800"
                      : "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed")
                  }
                >
                  Trước
                </button>

                <div className="flex items-center gap-1">
                  {pageButtons.map((p, idx) => {
                    if (p === "...") {
                      return (
                        <span key={`dots_${idx}`} className="px-2 text-sm text-gray-400 select-none">
                          ...
                        </span>
                      );
                    }

                    const active = Number(p) === currentPage;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => goToPage(p)}
                        className={
                          "h-10 min-w-10 px-3 rounded-xl border text-sm font-semibold " +
                          (active
                            ? "border-teal-600 text-teal-700 bg-white"
                            : "border-gray-200 bg-white hover:bg-gray-50 text-gray-800")
                        }
                        aria-current={active ? "page" : undefined}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canNext}
                  className={
                    "h-10 px-4 rounded-xl border text-sm font-semibold " +
                    (canNext
                      ? "border-gray-200 bg-white hover:bg-gray-50 text-gray-800"
                      : "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed")
                  }
                >
                  Sau
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </main>

      {filtersOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Đóng bộ lọc"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[92%] max-w-[420px] bg-white shadow-2xl">
            <ProductsFiltersPanel
              compact
              categoriesLoading={categoriesLoading}
              categoriesError={categoriesError}
              categories={categories}
              availableBrands={availableBrands}
              draft={filterDraft}
              setDraft={setFilterDraft}
              onApply={applyFilters}
              onClear={clearFilters}
              onClose={() => setFiltersOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
