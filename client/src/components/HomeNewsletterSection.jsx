import { Mail, Gift, Star } from "lucide-react";

const HomeNewsletterSection = () => {
  return (
    <section className="py-16">
      <div className="max-w-4xl mx-auto px-4">
        <div className="rounded-3xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 p-8 md:p-12">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
              <Mail size={32} className="text-teal-600" />
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-center text-3xl md:text-4xl font-extrabold text-gray-900">
            Nhận <span className="text-teal-600">ưu đãi độc quyền</span>
          </h2>

          {/* Description */}
          <p className="mt-3 text-center text-gray-600 text-base md:text-lg">
            Đăng ký email để nhận thông tin về bộ sưu tập mới nhất
          </p>

          {/* Form */}
          <div className="mt-8 max-w-md mx-auto">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500" />
                <input
                  type="email"
                  placeholder="Nhập email của bạn..."
                  readOnly
                  className="w-full h-12 pl-12 pr-4 rounded-full border-2 border-teal-200 bg-white text-gray-900 placeholder-gray-400 cursor-not-allowed"
                />
              </div>
              <button
                type="button"
                className="h-12 px-6 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center justify-center gap-2 transition whitespace-nowrap"
              >
                ➜
              </button>
            </div>
          </div>

          {/* Benefits */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-8 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <Gift size={16} className="text-teal-600" />
              <span>Giảm 10% đơn đầu</span>
            </div>
            <div className="flex items-center gap-2">
              <Star size={16} className="text-teal-600" />
              <span>Ưu đãi độc quyền</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeNewsletterSection;
