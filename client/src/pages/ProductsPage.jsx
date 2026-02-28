import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import { listProductsApi } from "../services/product.api";

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [searchDraft, setSearchDraft] = useState("");

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

  const page = useMemo(() => {
    const raw = Number(searchParams.get("page") || 1);
    if (!Number.isFinite(raw) || raw <= 0) return 1;
    return Math.floor(raw);
  }, [searchParams]);

  const sort = useMemo(() => {
    const v = String(searchParams.get("sort") || "new");
    if (v === "price_asc" || v === "price_desc" || v === "new") return v;
    return "new";
  }, [searchParams]);

  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await listProductsApi({
          search: q,
          page,
          limit: 24,
          categoryId,
          includeHidden: false,
          sort,
        });
        if (!mounted) return;
        setItems(Array.isArray(res?.items) ? res.items : []);
        setMeta(res?.meta || null);
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
  }, [q, page, categoryId, sort]);

  const updateParams = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || String(v).trim() === "") next.delete(k);
      else next.set(k, String(v));
    });
    setSearchParams(next, { replace: true });
  };

  const onSubmitSearch = (e) => {
    e.preventDefault();
    updateParams({ q: searchDraft.trim(), page: 1 });
  };

  const onChangeSort = (e) => {
    updateParams({ sort: e.target.value, page: 1 });
  };

  const canPrev = (meta?.page || 1) > 1;
  const canNext = (meta?.page || 1) < (meta?.totalPages || 1);
  const goPrev = () => canPrev && updateParams({ page: (meta?.page || 1) - 1 });
  const goNext = () => canNext && updateParams({ page: (meta?.page || 1) + 1 });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl md:text-3xl font-extrabold text-gray-900">Sản phẩm</div>
            <div className="mt-2 text-sm text-gray-600">
              {categoryName ? (
                <>
                  Danh mục: <span className="font-semibold text-gray-900">{categoryName}</span>
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

          <div className="flex items-center gap-3">
            <select
              value={sort}
              onChange={onChangeSort}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800"
            >
              <option value="new">Mới nhất</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
            </select>
          </div>
        </div>

        <form onSubmit={onSubmitSearch} className="mt-6 flex gap-3">
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Tìm kiếm sản phẩm, thương hiệu..."
            className="flex-1 h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-gray-300"
          />
          <button
            type="submit"
            className="h-11 px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold"
          >
            Tìm kiếm
          </button>
        </form>

        {error ? (
          <div className="mt-8 rounded-2xl border border-red-100 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {loading
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

        {!loading && !error && items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
            Không có sản phẩm phù hợp.
          </div>
        ) : null}

        {meta && meta.totalPages > 1 ? (
          <div className="mt-10 flex items-center justify-center gap-3">
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
            <div className="text-sm text-gray-600">
              Trang <span className="font-semibold text-gray-900">{meta.page}</span> / {meta.totalPages}
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
      </main>

      <Footer />
    </div>
  );
}
