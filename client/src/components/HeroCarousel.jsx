import { useMemo } from "react";
import Slider from "react-slick";

function HeroSlide({ slide }) {
  return (
    <div>
      <div className="relative overflow-hidden rounded-none">
        {/* Nền */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#2B6E74] via-[#4D8BA6] to-[#BBD4E8]" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-10 -top-10 w-56 h-56 rounded-full bg-white" />
          <div className="absolute right-14 top-10 w-40 h-40 rounded-full bg-white" />
          <div className="absolute right-10 top-32 w-56 h-56 rounded-[56px] bg-white rotate-12" />
        </div>

        {/* Nội dung */}
        <div className="relative px-6 md:px-10 py-10 md:py-14">
          <div className="flex items-center gap-8">
            {/* Bên trái */}
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center rounded-xl bg-[#0E3F4F] text-white/95 px-4 py-2 text-sm font-semibold tracking-wide">
                {slide.topBadge}
              </div>

              <div className="mt-6 flex items-start gap-6">
                <div className="leading-none">
                  <div className="text-[90px] md:text-[130px] font-extrabold text-white drop-shadow-[0_10px_0_rgba(9,41,51,0.35)]">
                    {slide.bigNumber}
                  </div>
                </div>

                <div className="pt-4 md:pt-6">
                  <div className="text-white/90 text-xl md:text-2xl font-semibold">{slide.subTitle}</div>
                  <div className="mt-2 text-white/90 text-[44px] md:text-[56px] font-extrabold leading-none">
                    {slide.bigSuffix}
                  </div>

                  <div className="mt-6 inline-flex items-center rounded-xl bg-[#0E3F4F] text-white px-4 py-2 text-base font-semibold">
                    {slide.dateRange}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="mt-10 md:mt-12 inline-flex items-center justify-center h-12 px-8 rounded-2xl bg-[#0E3F4F] text-white font-bold tracking-wide hover:bg-[#0B3442] transition"
              >
                XEM CHI TIẾT
              </button>
            </div>

            {/* Bên phải (ảnh) */}
            <div className="hidden lg:block w-[560px]">
              <div className="relative h-[300px]">
                <div className="absolute inset-0 rounded-[28px] bg-white/35 backdrop-blur-[1px] border border-white/40" />
                <img
                  src={slide.imageUrl}
                  alt={slide.imageAlt}
                  className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_40px_60px_rgba(0,0,0,0.22)]"
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
//Dữ liệu mẫu cho các slide
export default function HeroCarousel() {
  const slides = useMemo(
    () => [
      {
        id: "sale-50",
        topBadge: "THANH LÝ GIÁ TỐT - BẢO HÀNH 2 NĂM",
        bigNumber: "50",
        subTitle: "ƯU ĐÃI ĐẾN",
        bigSuffix: "%",
        dateRange: "01.04 - 30.04.2026",
        imageUrl:
          "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
        imageAlt: "Sofa phòng khách",
      },
      {
        id: "sale-30",
        topBadge: "ƯU ĐÃI MÙA MỚI - FREESHIP NỘI THÀNH",
        bigNumber: "30",
        subTitle: "GIẢM GIÁ",
        bigSuffix: "%",
        dateRange: "01.05 - 15.05.2026",
        imageUrl:
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
        imageAlt: "Phòng khách hiện đại",
      },
      {
        id: "combo",
        topBadge: "COMBO PHÒNG KHÁCH - QUÀ TẶNG KÈM",
        bigNumber: "10",
        subTitle: "TẶNG THÊM",
        bigSuffix: "%",
        dateRange: "16.05 - 31.05.2026",
        imageUrl:
          "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80",
        imageAlt: "Nội thất phòng khách",
      },
    ],
    [],
  );
//Điều chỉnh cài đặt cho slider
  const settings = {
    dots: true,
    infinite: true,
    speed: 600,
    autoplay: true,
    autoplaySpeed: 4500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    appendDots: (dots) => (
      <div>
        <ul className="!m-0 !p-0 flex items-center justify-center gap-2">{dots}</ul>
      </div>
    ),
    customPaging: () => (
      <div className="w-2.5 h-2.5 rounded-full bg-white/60 border border-white/70" />
    ),
  };

  return (
    <section className="w-full">
      <div className="relative">
        <Slider {...settings}>
          {slides.map((slide) => (
            <HeroSlide key={slide.id} slide={slide} />
          ))}
        </Slider>

        
        <style>{`
          .slick-dots { bottom: 14px; }
          .slick-dots li { margin: 0 !important; }
          .slick-dots li button:before { content: '' !important; }
          .slick-dots li.slick-active div { background: rgba(255,255,255,0.95) !important; }
        `}</style>
      </div>
    </section>
  );
}
