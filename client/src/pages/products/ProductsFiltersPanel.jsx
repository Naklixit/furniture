import React from "react";
import { Star, X } from "lucide-react";

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const PRICE_MIN = 0;
const PRICE_MAX = 50_000_000;
const PRICE_STEP = 100_000;

const formatVND = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0";
  try {
    // vi-VN uses '.' as thousands separator
    return new Intl.NumberFormat("vi-VN").format(Math.round(n));
  } catch {
    return String(Math.round(n));
  }
};

const StarsStatic = ({ value, size = 14 }) => {
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

const toggleBrand = (brands, brand) => {
  const b = String(brand || "").trim();
  if (!b) return brands || [];
  const exists = (brands || []).some((x) => String(x).toLowerCase() === b.toLowerCase());
  if (exists) return (brands || []).filter((x) => String(x).toLowerCase() !== b.toLowerCase());
  return uniqStrings([...(brands || []), b]);
};

export default function ProductsFiltersPanel({
  compact = false,
  categoriesLoading = false,
  categoriesError = "",
  categories = [],
  availableBrands = [],
  draft,
  setDraft,
  onApply,
  onClear,
  onClose,
}) {
  const ratingOptions = [
    { label: "Tất cả", value: "" },
    { label: "từ 5 sao", value: "5" },
    { label: "từ 4 sao", value: "4" },
    { label: "từ 3 sao", value: "3" },
  ];

  const priceMin = clamp(Number(draft?.minPrice ?? PRICE_MIN), PRICE_MIN, PRICE_MAX);
  const priceMax = clamp(Number(draft?.maxPrice ?? PRICE_MAX), PRICE_MIN, PRICE_MAX);
  const safeMin = Math.min(priceMin, priceMax);
  const safeMax = Math.max(priceMin, priceMax);

  const setPriceMin = (next) => {
    const n = clamp(Number(next), PRICE_MIN, PRICE_MAX);
    setDraft((d) => ({
      ...d,
      minPrice: Math.min(n, Number(d?.maxPrice ?? PRICE_MAX)),
    }));
  };

  const setPriceMax = (next) => {
    const n = clamp(Number(next), PRICE_MIN, PRICE_MAX);
    setDraft((d) => ({
      ...d,
      maxPrice: Math.max(n, Number(d?.minPrice ?? PRICE_MIN)),
    }));
  };

  return (
    <div
      className={
        "bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col " +
        (compact ? "h-full" : "sticky top-24 h-[calc(100vh-120px)]")
      }
    >
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="text-sm font-extrabold text-gray-900">Bộ lọc</div>
        {compact ? (
          <button
            type="button"
            className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 flex items-center justify-center"
            aria-label="Đóng bộ lọc"
            onClick={() => (typeof onClose === "function" ? onClose() : null)}
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      <div className="p-5 space-y-6 flex-1 overflow-y-auto">
        <div>
          <div className="text-xs font-extrabold text-gray-800">Danh mục</div>
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="radio"
                name={compact ? "category_mobile" : "category"}
                checked={!draft?.categoryId}
                onChange={() => setDraft((d) => ({ ...d, categoryId: "" }))}
              />
              Tất cả
            </label>

            {categoriesLoading ? (
              <div className="text-sm text-gray-500">Đang tải danh mục...</div>
            ) : categoriesError ? (
              <div className="text-sm text-red-600">{categoriesError}</div>
            ) : (
              (categories || []).map((c) => {
                const checked = String(draft?.categoryId || "") === String(c?.id || "");
                return (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none"
                    title={c?.name || ""}
                  >
                    <input
                      type="radio"
                      name={compact ? "category_mobile" : "category"}
                      checked={checked}
                      onChange={() => setDraft((d) => ({ ...d, categoryId: String(c?.id || "") }))}
                    />
                    <span className="truncate">{c?.name || ""}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div>
          <div className="text-xs font-extrabold text-gray-800">Khoảng giá</div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[12px] text-gray-700">
              <div>
                Từ <span className="font-semibold text-gray-900">{formatVND(safeMin)}đ</span>
              </div>
              <div>
                Đến <span className="font-semibold text-gray-900">{formatVND(safeMax)}đ</span>
              </div>
            </div>

            <div className="relative mt-3 h-10">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-gray-200" />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-teal-500"
                style={{
                  left: `${(safeMin / PRICE_MAX) * 100}%`,
                  right: `${100 - (safeMax / PRICE_MAX) * 100}%`,
                }}
              />

              <input
                type="range"
                min={PRICE_MIN}
                max={PRICE_MAX}
                step={PRICE_STEP}
                value={safeMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="range-slider absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full cursor-pointer text-teal-600"
                aria-label="Giá tối thiểu"
              />
              <input
                type="range"
                min={PRICE_MIN}
                max={PRICE_MAX}
                step={PRICE_STEP}
                value={safeMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="range-slider absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full cursor-pointer text-teal-600"
                aria-label="Giá tối đa"
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
              <span>{formatVND(PRICE_MIN)}đ</span>
              <span>{formatVND(PRICE_MAX)}đ</span>
            </div>

            {/* <div className="mt-2 text-[11px] text-gray-500">Kéo 2 đầu để chọn giá min/max (đồng bộ với giá hiển thị).</div> */}
          </div>
        </div>

        <div>
          <div className="text-xs font-extrabold text-gray-800">Tình trạng</div>
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(draft?.inStock)}
                onChange={() => setDraft((d) => ({ ...d, inStock: !d.inStock }))}
              />
              Còn hàng
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(draft?.onSale)}
                onChange={() => setDraft((d) => ({ ...d, onSale: !d.onSale }))}
              />
              Đang giảm giá
            </label>
          </div>
        </div>

        <div>
          <div className="text-xs font-extrabold text-gray-800">Đánh giá</div>
          <div className="mt-3 space-y-2">
            {ratingOptions.map((opt) => {
              const active = String(draft?.minRating || "") === String(opt.value);
              return (
                <label
                  key={opt.value || "all"}
                  className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none"
                >
                  <input
                    type="radio"
                    name={compact ? "rating_mobile" : "rating"}
                    checked={active}
                    onChange={() => setDraft((d) => ({ ...d, minRating: opt.value }))}
                  />
                  {opt.value ? (
                    <span className="inline-flex items-center gap-2">
                      <StarsStatic value={Number(opt.value)} size={14} />
                      <span className="text-xs text-gray-500">{opt.label}</span>
                    </span>
                  ) : (
                    <span>{opt.label}</span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-xs font-extrabold text-gray-800">Thương hiệu</div>
          <div className="mt-3 space-y-2">
            {availableBrands.length === 0 ? (
              <div className="text-sm text-gray-500">Chưa có dữ liệu thương hiệu.</div>
            ) : (
              availableBrands.map((b) => {
                const checked = (draft?.brands || []).some(
                  (x) => String(x).toLowerCase() === String(b).toLowerCase(),
                );
                return (
                  <label key={b} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setDraft((d) => ({ ...d, brands: toggleBrand(d.brands || [], b) }))}
                    />
                    <span className="truncate">{b}</span>
                  </label>
                );
              })
            )}
          </div>
          <div className="mt-2 text-[11px] text-gray-500">Danh sách thương hiệu được giữ ổn định để bạn chọn nhanh.</div>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-gray-200 bg-white flex items-center gap-3">
        <button
          type="button"
          className="flex-1 h-10 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold"
          onClick={() => (typeof onClear === "function" ? onClear() : null)}
        >
          Xoá bộ lọc
        </button>
        <button
          type="button"
          className="flex-1 h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold"
          onClick={() => (typeof onApply === "function" ? onApply() : null)}
        >
          Áp dụng
        </button>
      </div>
    </div>
  );
}
