import React, { useEffect, useRef, useState } from "react";

const AdminModal = ({
  open,
  title,
  subtitle,
  children,
  footer,
  onClose,
  closeOnBackdrop = true,
  closeOnEsc = true,
  maxWidthClass = "max-w-[720px]",
}) => {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const closeTimerRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setMounted(true);
      setTimeout(() => setVisible(true), 10);
      return;
    }

    setVisible(false);
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    closeTimerRef.current = setTimeout(() => {
      setMounted(false);
    }, 200);
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!closeOnEsc) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mounted, closeOnEsc, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={
          "absolute inset-0 bg-black/40 transition-opacity duration-200 " +
          (visible ? "opacity-100" : "opacity-0")
        }
        onMouseDown={(e) => {
          if (!closeOnBackdrop) return;
          if (e.target !== e.currentTarget) return;
          onClose?.();
        }}
        role="presentation"
      />

      <div
        className={
          "relative w-full bg-white rounded-2xl shadow-xl border border-gray-200 max-h-[calc(100vh-2rem)] flex flex-col " +
          maxWidthClass +
          " transition-all duration-200 transform " +
          (visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2")
        }
        role="dialog"
        aria-modal="true"
        aria-label={title || "Modal"}
      >
        {(title || subtitle) && (
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
            <div className="min-w-0">
              {title ? <div className="text-base font-semibold text-gray-900">{title}</div> : null}
              {subtitle ? (
                <div className="mt-0.5 text-xs text-gray-500 truncate max-w-[520px]">{subtitle}</div>
              ) : null}
            </div>

            <button
              type="button"
              className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center"
              aria-label="Đóng"
              onClick={() => onClose?.()}
            >
              ×
            </button>
          </div>
        )}

        <div className="px-6 py-5 flex-1 min-h-0 overflow-y-auto overscroll-contain">{children}</div>

        {footer ? <div className="px-6 py-4 border-t border-gray-200">{footer}</div> : null}
      </div>
    </div>
  );
};

export default AdminModal;
