import { useCallback, useMemo, useRef, useState } from "react";
import ToastContext from "./toast.context";

const genId = () => {
  // Đủ dùng cho id phía giao diện
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const ToastProvider = ({ children, maxToasts = 3, defaultDurationMs = 1500 }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    ({ type = "info", title = "", message = "", durationMs }) => {
      const id = genId();
      const duration = Number.isFinite(durationMs) ? durationMs : defaultDurationMs;

      setToasts((prev) => {
        const next = [{ id, type, title, message }, ...prev];
        return next.slice(0, Math.max(1, maxToasts));
      });

      const timer = setTimeout(() => removeToast(id), Math.max(800, duration));
      timersRef.current.set(id, timer);
      return id;
    },
    [defaultDurationMs, maxToasts, removeToast],
  );

  const api = useMemo(() => {
    return {
      toasts,
      removeToast,
      show: showToast,
      success: (message, opts = {}) => showToast({ type: "success", message, ...opts }),
      error: (message, opts = {}) => showToast({ type: "error", message, ...opts }),
      info: (message, opts = {}) => showToast({ type: "info", message, ...opts }),
    };
  }, [removeToast, showToast, toasts]);

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
};
