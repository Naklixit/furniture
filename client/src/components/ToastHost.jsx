import { X } from "lucide-react";
import { useToast } from "../context/useToast";
//Chỉnh màu theo status
const palette = {
  success: {
    ring: "ring-green-200",
    bg: "bg-green-50",
    border: "border-green-200",
    title: "text-green-900",
    text: "text-green-800",
    icon: "bg-green-600",
  },
  error: {
    ring: "ring-red-200",
    bg: "bg-red-50",
    border: "border-red-200",
    title: "text-red-900",
    text: "text-red-800",
    icon: "bg-red-600",
  },
  info: {
    ring: "ring-blue-200",
    bg: "bg-blue-50",
    border: "border-blue-200",
    title: "text-blue-900",
    text: "text-blue-800",
    icon: "bg-blue-600",
  },
};

const ToastHost = () => {
  const { toasts, removeToast } = useToast();

  if (!toasts?.length) return null;

  return (
    <div className="fixed right-4 top-4 z-[9999] flex w-[min(92vw,380px)] flex-col gap-2">
      {toasts.map((t) => {
        const styles = palette[t.type] || palette.info;
        return (
          <div
            key={t.id}
            className={`group relative overflow-hidden rounded-xl border ${styles.border} ${styles.bg} p-4 shadow-sm ring-1 ${styles.ring} animate-[toastIn_160ms_ease-out]`}
            role={t.type === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <div className={`mt-1 h-2.5 w-2.5 rounded-full ${styles.icon}`} aria-hidden="true" />

              <div className="min-w-0 flex-1">
                {t.title ? <div className={`text-sm font-semibold ${styles.title}`}>{t.title}</div> : null}
                <div className={`text-sm ${styles.text} break-words`}>{t.message}</div>
              </div>

              <button
                type="button"
                className={`-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:text-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${styles.ring}`}
                onClick={() => removeToast(t.id)}
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-black/5" />
          </div>
        );
      })}
    </div>
  );
};

export default ToastHost;
