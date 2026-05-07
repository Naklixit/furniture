import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BotMessageSquare, Send, X, Loader2 } from "lucide-react";
import { aiChatApi } from "../services/ai.api";
import { useToast } from "../context/useToast";

const STORAGE_KEY = "ai_assistant_chat_v1";

const formatMoneyVND = (n) => {
  const value = Number(n || 0);
  try {
    return value.toLocaleString("vi-VN") + "đ";
  } catch {
    return String(value) + "đ";
  }
};

const getDisplayPrice = (p) => {
  const original = Number(p?.originalPrice || 0);
  const sale = Number(p?.salePrice || 0);
  const hasSale = Number.isFinite(sale) && sale > 0 && sale < original;
  return { original, sale, hasSale, final: hasSale ? sale : original };
};

const loadStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
};

const saveStored = (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
};

export default function AiAssistantWidget() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState(() => {
    const stored = loadStored();
    const list = Array.isArray(stored?.messages) ? stored.messages : null;
    if (list?.length) return list;
    return [
      {
        id: crypto?.randomUUID?.() || String(Date.now()),
        role: "assistant",
        text: "Mình là trợ lý AI tư vấn nội thất. Bạn cần mua giường, bàn, sofa hay ghế?",
        products: [],
      },
    ];
  });

  const scrollRef = useRef(null);

  useEffect(() => {
    saveStored({ messages: messages.slice(-30) });
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages, loading]);

  const canSend = useMemo(() => {
    const t = String(input || "").trim();
    return t.length > 0 && t.length <= 600 && !loading;
  }, [input, loading]);

  const handleSend = async () => {
    const text = String(input || "").trim();
    if (!text) return;
    if (text.length > 600) {
      toast?.error?.("Tin nhắn quá dài (tối đa 600 ký tự). ");
      return;
    }

    setInput("");
    const userMsg = {
      id: crypto?.randomUUID?.() || String(Date.now() + Math.random()),
      role: "user",
      text,
      products: [],
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      setLoading(true);
      const history = (Array.isArray(messages) ? messages : [])
        .slice(-12)
        .map((m) => ({
          role: String(m?.role || ""),
          text: String(m?.text || ""),
        }))
        .filter((m) => (m.role === "user" || m.role === "assistant") && m.text);

      const res = await aiChatApi({ message: text, history });
      const reply = String(res?.reply || "").trim();
      const products = Array.isArray(res?.products) ? res.products : [];

      const botMsg = {
        id: crypto?.randomUUID?.() || String(Date.now() + Math.random()),
        role: "assistant",
        text:
          reply ||
          "Mình có thể gợi ý vài sản phẩm phù hợp. Bạn thích phong cách nào và ngân sách khoảng bao nhiêu?",
        products,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      const msg = e?.message || e?.response?.data?.message || "Không thể gửi tin nhắn";
      toast?.error?.(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto?.randomUUID?.() || String(Date.now() + Math.random()),
          role: "assistant",
          text: "Mình gặp lỗi khi xử lý. Bạn thử lại giúp mình nhé.",
          products: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    const initial = [
      {
        id: crypto?.randomUUID?.() || String(Date.now()),
        role: "assistant",
        text: "Mình là trợ lý AI tư vấn nội thất. Bạn đang cần mua giường, bàn, ghế, tủ/kệ hay sofa?",
        products: [],
      },
    ];
    setMessages(initial);
    saveStored({ messages: initial });
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9998]">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-teal-600 px-4 py-3 text-white shadow-lg hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
          aria-label="Mở trợ lý AI"
        >
          <BotMessageSquare size={18} />
          <span className="text-sm font-semibold">Trợ lý AI</span>
        </button>
      ) : (
        <div className="w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-teal-600 px-4 py-3 text-white">
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-5">Trợ lý AI</div>
              <div className="text-[12px] opacity-90">Tư vấn nội thất 24/7</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg bg-white/10 px-2 py-1 text-[12px] hover:bg-white/20"
                title="Xoá hội thoại"
              >
                Xoá
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="max-h-[58vh] overflow-y-auto p-3">
            <div className="flex flex-col gap-3">
              {messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ring-1 ring-black/5 ${
                        isUser
                          ? "bg-teal-600 text-white"
                          : "bg-gray-50 text-gray-800 border border-gray-200"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{m.text}</div>

                      {Array.isArray(m.products) && m.products.length ? (
                        <div className="mt-2 grid grid-cols-1 gap-2">
                          {m.products.slice(0, 5).map((p) => {
                            const price = getDisplayPrice(p);
                            return (
                              <Link
                                key={p.id}
                                to={`/products/${p.slug}`}
                                className="flex gap-3 rounded-xl border border-gray-200 bg-white p-2 hover:border-teal-300 hover:shadow-sm"
                              >
                                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                  {p.imageUrl ? (
                                    <img
                                      src={p.imageUrl}
                                      alt={p.name}
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : null}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="line-clamp-2 text-[13px] font-semibold text-gray-900">
                                    {p.name}
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 text-[12px]">
                                    <span className="font-semibold text-teal-700">
                                      {formatMoneyVND(price.final)}
                                    </span>
                                    {price.hasSale ? (
                                      <span className="text-gray-400 line-through">
                                        {formatMoneyVND(price.original)}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {loading ? (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <Loader2 className="animate-spin" size={16} />
                    Đang suy nghĩ...
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t border-gray-200 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (canSend) handleSend();
                  }
                }}
                placeholder="Hỏi về nội thất bạn muốn mua..."
                className="min-h-[42px] max-h-28 flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Gửi"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="mt-2 text-[11px] text-gray-500">
              Chỉ tư vấn sản phẩm nội thất có trên website.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
