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
    try {
      const el = document?.activeElement;
      if (el && typeof el.blur === "function") el.blur();
    } catch {
      // ignore
    }

    // Avoid restoring on initial load; always start at top
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

    const positions = loadPositions();
    const restoreY = Number.isFinite(Number(positions?.[pageKey]))
      ? Number(positions[pageKey])
      : null;

    // Run on next frame to avoid layout thrash
    const raf = window.requestAnimationFrame(() => {
      const shouldRestore = navType === "POP" && restoreY !== null;
      try {
        window.scrollTo({ top: shouldRestore ? restoreY : 0, left: 0, behavior: "auto" });
      } catch {
        window.scrollTo(0, shouldRestore ? restoreY : 0);
      }
    });

    return () => window.cancelAnimationFrame(raf);
  }, [pageKey, navType]);

  return null;
};

export default ScrollToTop;
