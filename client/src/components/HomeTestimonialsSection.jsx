import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";
import { getLatestReviewsApi } from "../services/review.api";

const StarsRow = ({ value, size = 16 }) => {
  const v = Math.max(0, Math.min(5, Number(value || 0)));
  return (
    <div className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        const ratio = Math.max(0, Math.min(1, v - i));
        return (
          <span key={idx} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="text-gray-300" fill="none" />
            {ratio > 0 ? (
              <span
                className="absolute left-0 top-0 overflow-hidden"
                style={{ width: `${ratio * 100}%`, height: size }}
              >
                <Star size={size} className="text-amber-400" fill="currentColor" />
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
};

const formatRelativeDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Hôm nay";
    if (days === 1) return "Hôm qua";
    if (days < 7) return `${days} ngày trước`;
    if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return "";
  }
};

const getInitial = (name) => {
  const n = String(name || "").trim();
  if (!n) return "?";
  const parts = n.split(/\s+/);
  return (parts[parts.length - 1]?.[0] || "?").toUpperCase();
};

const COLORS = [
  "bg-teal-500",
  "bg-blue-500",
  "bg-orange-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-emerald-500",
  "bg-indigo-500",
  "bg-rose-500",
];

export default function HomeTestimonialsSection() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        const res = await getLatestReviewsApi({ limit: 12 });
        if (!mounted) return;
        setReviews(Array.isArray(res?.items) ? res.items : []);
      } catch {
        if (!mounted) return;
        setReviews([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, []);

  const totalSlides = useMemo(() => Math.max(1, Math.ceil(reviews.length / 3)), [reviews.length]);

  // Auto-slide
  useEffect(() => {
    if (reviews.length <= 3) return;
    intervalRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % totalSlides);
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [reviews.length, totalSlides]);

  const goTo = (idx) => {
    setCurrent(idx);
    clearInterval(intervalRef.current);
    if (reviews.length > 3) {
      intervalRef.current = setInterval(() => {
        setCurrent((c) => (c + 1) % totalSlides);
      }, 5000);
    }
  };

  const goPrev = () => goTo((current - 1 + totalSlides) % totalSlides);
  const goNext = () => goTo((current + 1) % totalSlides);

  if (loading) {
    return (
      <section className="py-16">
        <div className="text-center">
          <div className="h-4 w-32 bg-gray-100 rounded mx-auto animate-pulse" />
          <div className="mt-4 h-10 w-80 bg-gray-100 rounded mx-auto animate-pulse" />
        </div>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="h-4 w-12 bg-gray-100 rounded animate-pulse" />
              <div className="mt-4 h-16 bg-gray-100 rounded animate-pulse" />
              <div className="mt-4 h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!reviews.length) return null;

  const visibleReviews = reviews.slice(current * 3, current * 3 + 3);

  return (
    <section className="py-16">
      <div className="text-center">
        <div className="text-[11px] tracking-[0.26em] font-semibold text-teal-500">
          TESTIMONIALS
        </div>
        <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-gray-900">
          Khách hàng <span className="text-teal-500">nói gì</span> về chúng tôi
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Đánh giá thực tế từ khách hàng đã mua sắm tại cửa hàng
        </p>
      </div>

      <div className="mt-10 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 anim-fade-up" key={current}>
          {visibleReviews.map((r, idx) => {
            const globalIdx = current * 3 + idx;
            const color = COLORS[globalIdx % COLORS.length];
            return (
              <div
                key={r.id}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col"
              >
                <div className="mb-4">
                  <Quote size={32} className="text-teal-200" fill="currentColor" />
                </div>

                <StarsRow value={r.rating} size={18} />

                <p className="mt-3 text-sm text-gray-700 leading-relaxed flex-1 line-clamp-4">
                  &ldquo;{r.content}&rdquo;
                </p>

                {r.product?.name && (
                  <div className="mt-3 text-xs text-teal-600 font-semibold truncate">
                    Sản phẩm: {r.product.name}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full ${color} text-white flex items-center justify-center text-sm font-bold shrink-0`}
                  >
                    {getInitial(r.user?.fullName)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate">
                      {r.user?.fullName || "Khách hàng"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatRelativeDate(r.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation */}
        {totalSlides > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={goPrev}
              className="w-10 h-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center transition"
              aria-label="Trước"
            >
              <ChevronLeft size={18} className="text-gray-600" />
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  className={
                    "h-2 rounded-full transition-all duration-300 " +
                    (i === current
                      ? "w-6 bg-teal-500"
                      : "w-2 bg-gray-300 hover:bg-gray-400")
                  }
                  aria-label={`Trang ${i + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={goNext}
              className="w-10 h-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center transition"
              aria-label="Sau"
            >
              <ChevronRight size={18} className="text-gray-600" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
