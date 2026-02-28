import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    try {
      const el = document?.activeElement;
      if (el && typeof el.blur === "function") el.blur();
    } catch {
      // ignore
    }

    // Run on next frame to avoid layout thrash
    const raf = window.requestAnimationFrame(() => {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      } catch {
        window.scrollTo(0, 0);
      }
    });

    return () => window.cancelAnimationFrame(raf);
  }, [location.pathname]);

  return null;
};

export default ScrollToTop;
