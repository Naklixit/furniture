import React, { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { listCategoriesApi } from "../services/category.api";

const HomeCategoriesSection = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await listCategoriesApi({ page: 1, limit: 50, includeHidden: false });
        if (!mounted) return;

        const items = Array.isArray(res?.items) ? res.items : [];
        const mapped = items
          .filter((c) => c && c.id && c.name)
          .slice(0, 8)
          .map((c) => ({
            id: c.id,
            name: c.name,
            description: (c.description || "").trim(),
          }));
        setCategories(mapped);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Không thể tải danh mục");
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

  const onClickCategory = (c) => {
    if (!c?.id) return;
    navigate(`/products?categoryId=${encodeURIComponent(c.id)}&category=${encodeURIComponent(c.name)}`);
  };

  return (
    <section className="py-16">
      <div className="text-center">
        <div className="text-[11px] tracking-[0.26em] font-semibold text-teal-500">DANH MỤC</div>
        <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-gray-900">
          Khám phá theo <span className="text-teal-500">phong cách</span> của bạn
        </h2>
        <p className="mt-3 text-sm md:text-base text-gray-500">
          Từ cổ điển đến hiện đại, chúng tôi có mọi thứ bạn cần
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="w-full rounded-2xl border border-gray-200 bg-white/80 shadow-xl p-5"
              >
                <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                <div className="mt-2 h-3 w-44 bg-gray-100 rounded animate-pulse" />
              </div>
            ))
          : error
            ? (
                <div className="col-span-full text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {error}
                </div>
              )
            : categories.length === 0
              ? (
                  <div className="col-span-full text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-3">
                    Chưa có danh mục.
                  </div>
                )
              : categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onClickCategory(c)}
                    className={
                      "group w-full text-left rounded-2xl border border-gray-200 bg-white/80 hover:bg-white " +
                      "shadow-sm hover:shadow-md transition p-5 flex items-center justify-between gap-4"
                    }
                  >
                    <div className="min-w-0">
                      <div className="text-base font-bold text-gray-900 truncate">{c.name}</div>
                      {c.description ? (
                        <div className="mt-1 text-sm text-gray-500 line-clamp-2">{c.description}</div>
                      ) : (
                        <div className="mt-1 text-sm text-gray-400">&nbsp;</div>
                      )}
                    </div>

                    <span
                      className={
                        "shrink-0 w-9 h-9 rounded-full bg-gray-100 border border-gray-200 " +
                        "flex items-center justify-center group-hover:bg-teal-50 group-hover:border-teal-100 transition"
                      }
                      aria-hidden="true"
                    >
                      <ArrowRight
                        size={16}
                        className="text-gray-500 group-hover:text-teal-600 transition"
                      />
                    </span>
                  </button>
                ))}
      </div>
    </section>
  );
};

export default HomeCategoriesSection;
