import { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const STORAGE_KEY = "scroll:positions:v1";

const safeParseJson = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const loadPositions = () => {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = safeParseJson(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const savePositions = (positions) => {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions || {}));
  } catch {
    // ignore
  }
};

const ScrollToTop = () => {
  const location = useLocation();
  const navType = useNavigationType();
  const didInitRef = useRef(false);
  const prevPathnameRef = useRef(null);

  const pageKey = useMemo(() => {
    return `${location.pathname}${location.search || ""}`;
  }, [location.pathname, location.search]);

  useEffect(() => {
    // Persist scrollY for current page while user scrolls
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        const y = Math.max(0, Math.round(window.scrollY || 0));
        const positions = loadPositions();
        positions[pageKey] = y;
        savePositions(positions);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [pageKey]);

  useEffect(() => {
    const pathname = location.pathname || "";

    // Chỉ đổi query (?q=, ?tab=...) — giữ scroll & focus (không blur input tìm kiếm).
    const prevPath = prevPathnameRef.current;
    const pathnameChanged = prevPath !== null && prevPath !== pathname;
    prevPathnameRef.current = pathname;

    // Lần đầu vào app: luôn về đầu trang
    if (!didInitRef.current) {
      didInitRef.current = true;
      const rafInit = window.requestAnimationFrame(() => {
        try {
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        } catch {
          window.scrollTo(0, 0);
        }
      });
      return () => window.cancelAnimationFrame(rafInit);
    }

    if (!pathnameChanged) {
      return undefined;
    }

    const positions = loadPositions();
    const restoreY = Number.isFinite(Number(positions?.[pageKey]))
      ? Number(positions[pageKey])
      : null;

    const raf = window.requestAnimationFrame(() => {
      const shouldRestore = navType === "POP" && restoreY !== null;
      try {
        window.scrollTo({ top: shouldRestore ? restoreY : 0, left: 0, behavior: "auto" });
      } catch {
        window.scrollTo(0, shouldRestore ? restoreY : 0);
      }
    });

    return () => window.cancelAnimationFrame(raf);
  }, [location.pathname, pageKey, navType]);

  return null;
};

export default ScrollToTop;
