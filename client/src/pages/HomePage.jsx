import { useEffect, useState } from "react";
import Header from "../components/Header";
import HeroCarousel from "../components/HeroCarousel";
import Footer from "../components/Footer";
import HomeCategoriesSection from "../components/HomeCategoriesSection";
import HomeFeaturedProductsSection from "../components/HomeFeaturedProductsSection";
import HomeTestimonialsSection from "../components/HomeTestimonialsSection";
import HomeNewsletterSection from "../components/HomeNewsletterSection";

const HomePage = () => {
  const [pageAnimKey, setPageAnimKey] = useState(0);
  useEffect(() => {
    setPageAnimKey((k) => k + 1);
  }, []);

  return (
    <div key={pageAnimKey} className="min-h-screen bg-gray-50 anim-fade-up">
      <Header />

      <main className="pt-0 pb-8">
        <div className="w-full">
          <HeroCarousel />
        </div>

        <div className="max-w-7xl mx-auto px-6">
          {/* Nội dung trang chủ phía dưới banner */}
          <HomeCategoriesSection />
          <HomeFeaturedProductsSection />
          <HomeTestimonialsSection />
          <HomeNewsletterSection />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
