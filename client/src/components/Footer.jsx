import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";

const BrandWordmark = () => {
  return (
    <div className="leading-none select-none" style={{ color: "#EAF3EF" }}>
      <div
        className="text-[26px] font-medium tracking-[0.06em]"
        style={{ fontFamily: "Arial, 'Times New Roman', Times, serif" }}
      >
        FRADEL
      </div>
    </div>
  );
};

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-14 bg-[#3e1236] text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <BrandWordmark />
            <p className="mt-4 text-sm text-white/80 leading-6">
              Nội thất hiện đại, tối giản và bền vững cho không gian sống của bạn.
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold tracking-wide">Liên kết</div>
            <ul className="mt-4 space-y-2 text-sm text-white/85">
              <li>
                <Link to="/" className="hover:text-white">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white">
                  Đăng nhập
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white">
                  Đăng ký
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className="hover:text-white">
                  Quên mật khẩu
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold tracking-wide">Hỗ trợ</div>
            <ul className="mt-4 space-y-2 text-sm text-white/85">
              <li>
                <a href="#" className="hover:text-white" onClick={(e) => e.preventDefault()}>
                  Chính sách đổi trả
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white" onClick={(e) => e.preventDefault()}>
                  Chính sách bảo hành
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white" onClick={(e) => e.preventDefault()}>
                  Vận chuyển & giao hàng
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white" onClick={(e) => e.preventDefault()}>
                  Hướng dẫn mua hàng
                </a>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold tracking-wide">Liên hệ</div>
            <ul className="mt-4 space-y-3 text-sm text-white/85">
              <li className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 text-white/80" />
                <span>TP.Đà Nẵng, Việt Nam</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} className="text-white/80" />
                <a className="hover:text-white" href="tel:+84000000000">
                  +84 000 000 000
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} className="text-white/80" />
                <a className="hover:text-white" href="mailto:support@fradel.vn">
                  support@fradel.vn
                </a>
              </li>
            </ul>

            <div className="mt-5 flex items-center gap-3">
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center"
                aria-label="Facebook"
              >
                <Facebook size={18} />
              </a>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center"
                aria-label="Instagram"
              >
                <Instagram size={18} />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/15 flex flex-col md:flex-row gap-3 md:items-center md:justify-between text-xs text-white/70">
          <div>© {year} FRADEL FURNITURE. All rights reserved.</div>
          <div className="flex items-center gap-3">
            <a href="#" className="hover:text-white" onClick={(e) => e.preventDefault()}>
              Điều khoản
            </a>
            <span className="text-white/30">|</span>
            <a href="#" className="hover:text-white" onClick={(e) => e.preventDefault()}>
              Bảo mật
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
