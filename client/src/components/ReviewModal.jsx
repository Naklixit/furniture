import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Star, Image as ImageIcon, Trash2, Loader2 } from "lucide-react";
import { createReviewApi } from "../services/review.api";
import { useToast } from "../context/useToast";

const normalizeSpaces = (s) => {
  if (typeof s !== "string") return "";
  return s.trim().replace(/\s+/g, " ");
};

const looksLikeSpamOrContactInfo = (text) => {
  const t = String(text || "");
  if (!t) return false;
  if (/https?:\/\//i.test(t) || /\bwww\./i.test(t)) return true;
  if (/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/i.test(t)) return true;
  if (/\b0\d{9}\b/.test(t)) return true;
  if (/\b(zalo|facebook|fb|telegram|tiktok|instagram|ig)\b/i.test(t)) return true;
  return false;
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export default function ReviewModal({ open, order, initialProductId, onClose, onCreated }) {
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const items = useMemo(() => (Array.isArray(order?.items) ? order.items : []), [order]);
  const orderId = order?.id || "";

  const defaultProductId = useMemo(() => {
    const wanted = typeof initialProductId === "string" ? initialProductId : "";
    if (wanted && items.some((it) => String(it?.productId) === String(wanted))) return wanted;
    return items[0]?.productId || "";
  }, [initialProductId, items]);

  const [productId, setProductId] = useState(defaultProductId);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setError("");
    setBusy(false);
    setRating(0);
    setContent("");
    setFiles([]);
    setProductId(defaultProductId);
  }, [open, defaultProductId]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const selected = useMemo(() => items.find((it) => String(it?.productId) === String(productId)) || null, [items, productId]);

  const previews = useMemo(() => {
    return (files || []).map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  useEffect(() => {
    return () => {
      previews.forEach((p) => {
        try {
          URL.revokeObjectURL(p.url);
        } catch {
          // ignore
        }
      });
    };
  }, [previews]);

  const addFiles = (list) => {
    const incoming = Array.from(list || []).filter(Boolean);
    if (incoming.length === 0) return;

    const max = 4;
    const next = [...files];
    for (const f of incoming) {
      if (next.length >= max) break;
      if (!/^image\//.test(f.type || "")) continue;
      if (f.size > 10 * 1024 * 1024) continue;
      next.push(f);
    }
    setFiles(next);
  };

  const validate = () => {
    if (!orderId) return "Thiếu thông tin đơn hàng";
    if (!productId) return "Vui lòng chọn sản phẩm";
    if (!rating || rating < 1 || rating > 5) return "Vui lòng chọn số sao";
    const cleaned = normalizeSpaces(content);
    if (!cleaned) return "Vui lòng nhập nội dung đánh giá";
    if (cleaned.length > 2000) return "Nội dung đánh giá quá dài (tối đa 2000 ký tự)";
    if (looksLikeSpamOrContactInfo(cleaned)) return "Không được chứa link/thông tin liên hệ";
    if (/(.)\1{6,}/.test(cleaned)) return "Nội dung đánh giá không hợp lệ";
    return "";
  };

  const submit = async () => {
    if (busy) return;
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setError("");

    try {
      setBusy(true);
      const res = await createReviewApi({
        orderId,
        productId,
        rating: clamp(Number(rating || 0), 1, 5),
        content: normalizeSpaces(content),
        images: files,
      });
      toast?.success?.(res?.message || "Đã gửi đánh giá");
      onCreated?.(res?.review);
      onClose?.();
    } catch (e) {
      const m = e?.message || "Không thể gửi đánh giá";
      setError(m);
      toast?.error?.(m);
    } finally {
      setBusy(false);
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div
        className="absolute inset-0 bg-black/40"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
        role="presentation"
      >
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden anim-fade-up flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-base font-extrabold text-gray-900">Đánh giá sản phẩm</div>
                <div className="text-xs text-gray-500 truncate">{order?.orderCode ? `Đơn #${order.orderCode}` : ""}</div>
              </div>
              <button
                type="button"
                onClick={() => onClose?.()}
                className="w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 inline-flex items-center justify-center"
                aria-label="Đóng"
              >
                <X size={18} className="text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-5 flex-1 overflow-y-auto">
              {items.length > 1 ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-sm font-bold text-gray-900">Chọn sản phẩm</div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map((it) => {
                      const pid = String(it?.productId || "");
                      const active = pid && pid === String(productId);
                      return (
                        <button
                          key={pid || it?.slug || it?.name || Math.random()}
                          type="button"
                          onClick={() => setProductId(pid)}
                          className={
                            "flex items-center gap-3 p-3 rounded-xl border text-left transition-all " +
                            (active
                              ? "border-teal-300 bg-white shadow-sm"
                              : "border-gray-200 bg-white hover:border-gray-300")
                          }
                        >
                          <div className="w-12 h-12 rounded-xl border border-gray-200 bg-white overflow-hidden shrink-0">
                            {it?.imageUrl ? (
                              <img src={it.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gray-100" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 line-clamp-2">{it?.name || ""}</div>
                            <div className="text-xs font-semibold text-gray-600">SL: {Number(it?.qty || 0)}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : selected ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-gray-200 bg-white overflow-hidden shrink-0">
                    {selected?.imageUrl ? (
                      <img src={selected.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 line-clamp-2">{selected?.name || ""}</div>
                    <div className="text-xs text-gray-600">SL: {Number(selected?.qty || 0)}</div>
                  </div>
                </div>
              ) : null}

              <div>
                <div className="text-sm font-bold text-gray-900">Đánh giá của bạn</div>
                <div className="mt-2 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const v = i + 1;
                    const active = rating >= v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setRating(v)}
                        className={
                          "w-9 h-9 rounded-xl inline-flex items-center justify-center transition-all " +
                          (active ? "bg-amber-50" : "bg-gray-50 hover:bg-gray-100")
                        }
                        aria-label={`${v} sao`}
                      >
                        <Star
                          size={18}
                          className={active ? "text-amber-500" : "text-gray-400"}
                          fill={active ? "currentColor" : "none"}
                        />
                      </button>
                    );
                  })}
                  <div className="ml-2 text-xs text-gray-600">{rating ? `${rating}/5` : "Chọn số sao"}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-bold text-gray-900">Nội dung</div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="mt-2 w-full px-4 py-3 rounded-2xl border border-gray-300 outline-none focus:ring-2 focus:ring-teal-200"
                  placeholder="Hãy chia sẻ cảm nhận thật của bạn về sản phẩm (không chứa link/thông tin liên hệ)"
                />
                <div className="mt-1 text-xs text-gray-500 flex items-center justify-between gap-3">
                  <span>Tối thiểu 10 ký tự, tối đa 600 ký tự</span>
                  <span className={content.length > 600 ? "text-red-600" : ""}>{content.length}/600</span>
                </div>
              </div>

              <div>
                <div className="text-sm font-bold text-gray-900">Ảnh đính kèm (tối đa 4)</div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-10 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold inline-flex items-center gap-2"
                  >
                    <ImageIcon size={16} className="text-gray-600" />
                    Chọn ảnh
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addFiles(e.target.files);
                      try {
                        e.target.value = "";
                      } catch {
                        // ignore
                      }
                    }}
                  />
                  <div className="text-xs text-gray-500">Chỉ nhận ảnh, tối đa 10MB/ảnh</div>
                </div>

                {previews.length ? (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {previews.map((p) => (
                      <div key={p.url} className="relative rounded-2xl border border-gray-200 overflow-hidden bg-white">
                        <img src={p.url} alt="" className="w-full h-24 object-cover" />
                        <button
                          type="button"
                          onClick={() => setFiles((prev) => prev.filter((x) => x !== p.file))}
                          className="absolute top-2 right-2 w-8 h-8 rounded-xl bg-white/90 border border-gray-200 inline-flex items-center justify-center hover:bg-white"
                          aria-label="Xoá ảnh"
                        >
                          <Trash2 size={14} className="text-gray-700" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 text-red-700 px-4 py-3 text-sm">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-white shrink-0">
              <button
                type="button"
                onClick={() => onClose?.()}
                className="h-10 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold"
                disabled={busy}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className={
                  "h-10 px-5 rounded-xl text-sm font-bold text-white inline-flex items-center gap-2 transition-transform duration-150 active:scale-[0.99] " +
                  (busy ? "bg-teal-400 cursor-not-allowed" : "bg-teal-600 hover:bg-teal-700")
                }
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                {busy ? "Đang gửi..." : "Gửi đánh giá"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
