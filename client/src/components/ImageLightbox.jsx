import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";

const clampIndex = (idx, len) => {
  if (!len) return 0;
  const i = Number(idx || 0);
  if (!Number.isFinite(i)) return 0;
  return Math.max(0, Math.min(len - 1, i));
};

const clamp = (v, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
};

export default function ImageLightbox({
  open,
  images,
  initialIndex = 0,
  alt = "",
  onClose,
}) {
  const urls = useMemo(() => {
    return (Array.isArray(images) ? images : [])
      .map((it) => (typeof it === "string" ? it : it?.url))
      .filter(Boolean);
  }, [images]);

  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [entered, setEntered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const viewportRef = useRef(null);
  const imgRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0, pointerId: null });
  const baseSizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    if (!open) return;
    setIndex(clampIndex(initialIndex, urls.length));
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setEntered(false);

    const t = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialIndex, urls.length]);

  useEffect(() => {
    if (!open) return;
    setPan({ x: 0, y: 0 });
  }, [open, index]);

  const measureBaseSize = () => {
    const el = imgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    baseSizeRef.current = { w: r.width, h: r.height };
  };

  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      measureBaseSize();
      setPan((p) => {
        const vp = viewportRef.current?.getBoundingClientRect();
        if (!vp) return p;
        const base = baseSizeRef.current;
        const maxX = Math.max(0, (base.w * zoom - vp.width) / 2);
        const maxY = Math.max(0, (base.h * zoom - vp.height) / 2);
        return { x: clamp(p.x, -maxX, maxX), y: clamp(p.y, -maxY, maxY) };
      });
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, zoom]);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
        return;
      }
      if (e.key === "ArrowLeft") {
        setIndex((i) => (urls.length ? (i - 1 + urls.length) % urls.length : 0));
        return;
      }
      if (e.key === "ArrowRight") {
        setIndex((i) => (urls.length ? (i + 1) % urls.length : 0));
        return;
      }

      if (e.key === "+" || e.key === "=" /* some keyboards */) {
        setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100));
        return;
      }
      if (e.key === "-") {
        setZoom((z) => Math.max(1, Math.round((z - 0.25) * 100) / 100));
        return;
      }
      if (e.key === "0") {
        setZoom(1);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, urls.length]);

  if (!open) return null;

  const hasMany = urls.length > 1;
  const currentUrl = urls[index] || "";

  const applyZoom = (nextZoom) => {
    const z = clamp(nextZoom, 1, 3);
    setZoom(z);

    // Keep pan within bounds after zoom changes
    window.requestAnimationFrame(() => {
      measureBaseSize();
      setPan((p) => {
        const vp = viewportRef.current?.getBoundingClientRect();
        if (!vp) return p;
        const base = baseSizeRef.current;
        const maxX = Math.max(0, (base.w * z - vp.width) / 2);
        const maxY = Math.max(0, (base.h * z - vp.height) / 2);
        return { x: clamp(p.x, -maxX, maxX), y: clamp(p.y, -maxY, maxY) };
      });
    });
  };

  const ui = (
    <div
      className={
        "fixed inset-0 z-[9999] bg-black/70 transition-opacity duration-150 ease-out " +
        (entered ? "opacity-100" : "opacity-0")
      }
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh"
      onMouseDown={(e) => {
        // click backdrop to close
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="absolute top-4 left-4 z-[10000]">
        <div className="px-3 py-1.5 rounded-full bg-black/40 text-white text-sm font-semibold">
          {urls.length ? `${index + 1}/${urls.length}` : "0/0"}
        </div>
      </div>

      <div className="absolute top-3 right-3 z-[10000] flex items-center gap-2">
        <button
          type="button"
          className="w-10 h-10 rounded-full bg-black/45 hover:bg-black/60 text-white flex items-center justify-center disabled:opacity-40"
          onClick={() => applyZoom(Math.round((zoom - 0.25) * 100) / 100)}
          aria-label="Thu nhỏ"
          title="Thu nhỏ"
          disabled={zoom <= 1}
        >
          <Minus size={18} />
        </button>
        <button
          type="button"
          className="w-10 h-10 rounded-full bg-black/45 hover:bg-black/60 text-white flex items-center justify-center disabled:opacity-40"
          onClick={() => applyZoom(Math.round((zoom + 0.25) * 100) / 100)}
          aria-label="Phóng to"
          title="Phóng to"
          disabled={zoom >= 3}
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          className="w-10 h-10 rounded-full bg-black/45 hover:bg-black/60 text-white flex items-center justify-center"
          onClick={() => onClose?.()}
          aria-label="Đóng"
          title="Đóng"
        >
          <X size={20} />
        </button>
      </div>

      {hasMany ? (
        <button
          type="button"
          className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-[10000] w-12 h-12 rounded-full bg-black/45 hover:bg-black/60 text-white flex items-center justify-center"
          onClick={() => setIndex((i) => (i - 1 + urls.length) % urls.length)}
          aria-label="Ảnh trước"
          title="Ảnh trước"
        >
          <ChevronLeft size={26} />
        </button>
      ) : null}

      {hasMany ? (
        <button
          type="button"
          className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-[10000] w-12 h-12 rounded-full bg-black/45 hover:bg-black/60 text-white flex items-center justify-center"
          onClick={() => setIndex((i) => (i + 1) % urls.length)}
          aria-label="Ảnh sau"
          title="Ảnh sau"
        >
          <ChevronRight size={26} />
        </button>
      ) : null}

      <div ref={viewportRef} className="w-full h-full flex items-center justify-center p-6 overflow-hidden">
        {currentUrl ? (
          <div
            className={
              "max-h-[92vh] max-w-[96vw] flex items-center justify-center " +
              (entered ? "anim-drop-down" : "")
            }
          >
            <img
              ref={imgRef}
              src={currentUrl}
              alt={alt}
              className={
                "max-h-[92vh] max-w-[96vw] object-contain select-none origin-center " +
                (dragging ? "cursor-grabbing" : "cursor-grab")
              }
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                transition: dragging ? "none" : "transform 180ms ease-out",
              }}
              draggable={false}
              onLoad={() => {
                measureBaseSize();
              }}
              onMouseDown={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                // drag to pan (no scrollbars)
                if (!e.isPrimary) return;
                dragRef.current.active = true;
                dragRef.current.pointerId = e.pointerId;
                dragRef.current.startX = e.clientX;
                dragRef.current.startY = e.clientY;
                dragRef.current.startPanX = pan.x;
                dragRef.current.startPanY = pan.y;
                setDragging(true);
                try {
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                } catch {
                  // ignore
                }
              }}
              onPointerMove={(e) => {
                if (!dragRef.current.active) return;
                if (dragRef.current.pointerId !== e.pointerId) return;

                const dx = e.clientX - dragRef.current.startX;
                const dy = e.clientY - dragRef.current.startY;

                const vp = viewportRef.current?.getBoundingClientRect();
                const base = baseSizeRef.current;
                const maxX = vp ? Math.max(0, (base.w * zoom - vp.width) / 2) : 0;
                const maxY = vp ? Math.max(0, (base.h * zoom - vp.height) / 2) : 0;

                setPan({
                  x: clamp(dragRef.current.startPanX + dx, -maxX, maxX),
                  y: clamp(dragRef.current.startPanY + dy, -maxY, maxY),
                });
              }}
              onPointerUp={(e) => {
                if (dragRef.current.pointerId !== e.pointerId) return;
                dragRef.current.active = false;
                dragRef.current.pointerId = null;
                setDragging(false);
              }}
              onPointerCancel={(e) => {
                if (dragRef.current.pointerId !== e.pointerId) return;
                dragRef.current.active = false;
                dragRef.current.pointerId = null;
                setDragging(false);
              }}
              onDoubleClick={() => {
                applyZoom(zoom > 1 ? 1 : 1.5);
                setPan({ x: 0, y: 0 });
              }}
              title={zoom > 1 ? "Giữ chuột để kéo ảnh • Double click để reset" : "Double click để zoom"}
            />
          </div>
        ) : (
          <div className="text-white/80 text-sm">Không có ảnh</div>
        )}
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
