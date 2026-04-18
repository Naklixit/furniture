import { useEffect, useMemo, useRef, useState } from "react";
import Slider from "react-slick";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { getLatestReviewsApi } from "../services/review.api";
import "slick-carousel/slick/slick.css";

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

const ReviewCard = ({ r, globalIdx }) => {
  const color = COLORS[globalIdx % COLORS.length];
  const reviewImageUrl = r?.images?.[0]?.url || "";
  return (
    <div className="px-2 pb-2">
      <div className="h-full rounded-2xl shadow-xl border border-gray-200/80 bg-white p-4 shadow-md hover:shadow-lg hover:border-teal-100 transition-all duration-300 flex flex-col min-h-[200px]">
        {reviewImageUrl ? (
          <div className="mb-3 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
            <img
              src={reviewImageUrl}
              alt="Review"
              className="h-32 w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        ) : null}

        <div className="mb-3 flex items-start justify-between gap-2">
          <Quote size={28} className="text-teal-200 shrink-0" fill="currentColor" />
          <StarsRow value={r.rating} size={18} />
        </div>

        <p className="text-sm text-gray-700 leading-relaxed flex-1 line-clamp-4">
          &ldquo;{r.content || ""}&rdquo;
        </p>

        {r.product?.name ? (
          <div className="mt-3 text-xs text-teal-600 font-semibold truncate">Sản phẩm: {r.product.name}</div>
        ) : null}

        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full ${color} text-white flex items-center justify-center text-sm font-bold shrink-0 ring-2 ring-white shadow-sm`}
          >
            {getInitial(r.user?.fullName)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-900 truncate">{r.user?.fullName || "Khách hàng"}</div>
            <div className="text-xs text-gray-500">{formatRelativeDate(r.createdAt)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function HomeTestimonialsSection() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const sliderRef = useRef(null);

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
    return () => {
      mounted = false;
    };
  }, []);

  const sliderSettings = useMemo(() => {
    return {
      dots: true,
      infinite: true,
      speed: 480,
      slidesToShow: 3,
      slidesToScroll: 1,
      autoplay: reviews.length > 3,
      autoplaySpeed: 5200,
      pauseOnHover: true,
      arrows: false,
      dotsClass: "testimonial-dots",
      customPaging: () => (
        <span className="dot block h-2 w-2 rounded-full bg-gray-300 transition-all duration-200" />
      ),
      appendDots: (dots) => (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => sliderRef.current?.slickPrev?.()}
            aria-label="Xem đánh giá trước"
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-teal-600 hover:border-teal-200 transition"
          >
            <ChevronLeft size={18} />
          </button>

          {dots}

          <button
            type="button"
            onClick={() => sliderRef.current?.slickNext?.()}
            aria-label="Xem đánh giá tiếp theo"
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-teal-600 hover:border-teal-200 transition"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      ),
      responsive: [
        {
          breakpoint: 1024,
          settings: {
            slidesToShow: 2,
            slidesToScroll: 1,
          },
        },
        {
          breakpoint: 640,
          settings: {
            slidesToShow: 1,
            slidesToScroll: 1,
          },
        },
      ],
    };
  }, [reviews.length]);     

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

  return (
    <section className="py-16">
      <div className="text-center max-w-2xl mx-auto px-4">
        <div className="text-[11px] tracking-[0.26em] font-semibold text-teal-500">TESTIMONIALS</div>
        <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-gray-900">
          Khách hàng <span className="text-teal-500">nói gì</span> về chúng tôi
        </h2>
        <p className="mt-2 text-sm text-gray-500">Đánh giá thực tế từ khách hàng đã mua sắm tại cửa hàng</p>
      </div>

      <div className="mt-10 max-w-7xl mx-auto px-4 md:px-6">
        <div className="testimonials-slick [&_.testimonial-dots]:static [&_.testimonial-dots]:m-0 [&_.testimonial-dots]:p-0 [&_.testimonial-dots]:list-none [&_.testimonial-dots]:flex [&_.testimonial-dots]:items-center [&_.testimonial-dots]:justify-center [&_.testimonial-dots]:gap-2 [&_.testimonial-dots_li]:m-0 [&_.testimonial-dots_li]:list-none [&_.testimonial-dots_li_button]:p-0 [&_.testimonial-dots_li_button]:text-[0px] [&_.testimonial-dots_li_button]:leading-none [&_.testimonial-dots_li_button:before]:hidden [&_.testimonial-dots_li.slick-active_.dot]:w-8 [&_.testimonial-dots_li.slick-active_.dot]:bg-teal-500">
          <Slider ref={sliderRef} {...sliderSettings}>
            {reviews.map((r, idx) => (
              <div key={r.id}>
                <ReviewCard r={r} globalIdx={idx} />
              </div>
            ))}
          </Slider>
        </div>
      </div>
    </section>
  );
}
