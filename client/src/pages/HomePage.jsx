import Header from "../components/Header";
import HeroCarousel from "../components/HeroCarousel";
import Footer from "../components/Footer";
import HomeCategoriesSection from "../components/HomeCategoriesSection";
import HomeFeaturedProductsSection from "../components/HomeFeaturedProductsSection";

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="pt-0 pb-8">
        <div className="w-full">
          <HeroCarousel />
        </div>

        <div className="max-w-7xl mx-auto px-6">
          {/* Nội dung trang chủ phía dưới banner */}
          <HomeCategoriesSection />
          <HomeFeaturedProductsSection />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
