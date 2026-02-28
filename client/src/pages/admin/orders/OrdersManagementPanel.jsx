import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RotateCw, Search } from "lucide-react";
import { useAdminOrders } from "./useAdminOrders";
import { getPageNumbers } from "../shared/pagination";
import { useResultsAnimKey } from "../shared/useResultsAnimKey";
import { updateAdminOrderStatusApi } from "../../../services/order.api";

const formatMoneyVND = (n) => {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("vi-VN") + "đ";
};

const formatDateTime = (value) => {
  try {
    const d = new Date(value);
    const t = d.getTime();
    if (!Number.isFinite(t)) return "";
    return d.toLocaleString("vi-VN");
  } catch {
    return "";
  }
};

const STATUS_LABEL = {
  pending: "Chờ xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Hủy đơn",
};

const PAYMENT_LABEL = {
  COD: "COD",
  VNPAY: "VNPAY",
  MOMO: "MOMO",
};

const badgeClassByPaymentMethod = (method) => {
  switch (String(method || "").toUpperCase()) {
    case "VNPAY":
      return "bg-violet-50 border-violet-200 text-violet-700";
    case "MOMO":
      return "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700";
    case "COD":
      return "bg-amber-50 border-amber-200 text-amber-700";
    default:
      return "bg-gray-50 border-gray-200 text-gray-700";
  }
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Chờ xác nhận" },
  { value: "shipping", label: "Đang giao" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Hủy đơn" },
];

const badgeClassByStatus = (status) => {
  switch (status) {
    case "completed":
      return "bg-emerald-50 border-emerald-200 text-emerald-700";
    case "shipping":
      return "bg-blue-50 border-blue-200 text-blue-700";
    case "cancelled":
      return "bg-red-50 border-red-200 text-red-700";
    default:
      return "bg-amber-50 border-amber-200 text-amber-700";
  }
};

const OrdersManagementPanel = ({ toast }) => {
  const {
    loading,
    error,
    dataVersion,
    items,
    page,
    limit,
    total,
    totalPages,
    searchInput,
    setSearchInput,
    setPage,
    setLimit,
    refresh,
    patchItem,
    reset,
  } = useAdminOrders({ enabled: true });

  const [busyId, setBusyId] = useState("");

  const [statusMenu, setStatusMenu] = useState(null);
  const statusMenuRef = useRef(null);

  useEffect(() => {
    if (!statusMenu) return;

    const onDocMouseDown = (e) => {
      const el = statusMenuRef.current;
      if (!el) return;
      if (el.contains(e.target)) return;
      setStatusMenu(null);
    };

    const onEsc = (e) => {
      if (e.key === "Escape") setStatusMenu(null);
    };

    const onScrollOrResize = () => setStatusMenu(null);

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [statusMenu]);

  const openStatusMenu = (row, anchorEl) => {
    if (!row?.id) return;
    if (!anchorEl?.getBoundingClientRect) return;
    const r = anchorEl.getBoundingClientRect();
    const baseWidth = Math.max(220, Math.round(r.width));
    const maxLeft = Math.max(8, window.innerWidth - baseWidth - 8);
    const left = Math.min(Math.max(8, Math.round(r.left)), maxLeft);
    const top = Math.round(r.bottom + 8);
    setStatusMenu({ id: row.id, status: row.status, left, top, width: baseWidth });
  };

  const columns = useMemo(
    () => ["Mã ĐH", "Khách hàng", "Sản phẩm", "Tổng tiền", "PTTT", "Ngày đặt", "Trạng thái"],
    [],
  );

  const thClassByColumn = useMemo(() => {
    return {
      "Mã ĐH": "w-[120px]",
      "Khách hàng": "w-[260px]",
      "Sản phẩm": "w-[260px]",
      "Tổng tiền": "w-[140px]",
      "PTTT": "w-[100px]",
      "Ngày đặt": "w-[180px]",
      "Trạng thái": "w-[220px]",
    };
  }, []);

  const pageNumbers = useMemo(() => getPageNumbers(page, totalPages), [page, totalPages]);
  const resultsAnimKey = useResultsAnimKey(loading, dataVersion);

  const onChangeStatus = async (row, nextStatus) => {
    if (!row?.id) return;
    const prev = row.status;
    if (prev === nextStatus) return;

    try {
      setBusyId(row.id);
      patchItem(row.id, { status: nextStatus });
      const res = await updateAdminOrderStatusApi(row.id, nextStatus);
      patchItem(row.id, res?.order || { status: nextStatus });
      toast?.success?.("Đã cập nhật trạng thái");
    } catch (err) {
      patchItem(row.id, { status: prev });
      toast?.error?.(err?.message || "Không thể cập nhật trạng thái");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between gap-3">
        <div className="relative w-full max-w-[360px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm kiếm mã đơn, tên, SĐT..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:border-gray-300"
          />
        </div>

        {loading && <div className="hidden md:block text-sm text-gray-500">Đang tải...</div>}

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="w-10 h-10 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center"
            aria-label="Làm mới"
            onClick={() => {
              reset();
              refresh({ search: "", page: 1, limit });
            }}
          >
            <RotateCw size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div key={resultsAnimKey} className={!loading && !error ? "anim-fade-up" : ""}>
          <table className="w-full min-w-[1280px] table-fixed">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm">
                {columns.map((c) => (
                  <th
                    key={c}
                    className={
                      "text-left font-medium px-6 py-4 whitespace-nowrap " +
                      (thClassByColumn[c] || "")
                    }
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className={"divide-y divide-gray-100 " + (loading ? "opacity-60" : "opacity-100")}>
              {loading ? (
                <tr>
                  <td className="px-6 py-10 text-sm text-gray-500" colSpan={columns.length}>
                    Đang tải...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-6 py-10 text-sm text-red-600" colSpan={columns.length}>
                    {error}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-sm text-gray-500" colSpan={columns.length}>
                    Không có đơn hàng.
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const first = Array.isArray(row.items) ? row.items[0] : null;
                  return (
                    <tr key={row.id} className={busyId === row.id ? "bg-gray-50" : "bg-white"}>
                      <td className="px-6 py-4 text-sm text-gray-900 font-semibold whitespace-nowrap">
                        #{row.orderCode}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="font-semibold text-gray-900 truncate">{row.customer?.fullName || ""}</div>
                        <div className="text-xs text-gray-500 truncate">{row.customer?.phoneNumber || ""}</div>
                        <div className="text-xs text-gray-500 truncate">{row.shipping?.address || ""}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {first?.name || ""}
                          {Array.isArray(row.items) && row.items.length > 1 ? ` x${row.items.length}` : ""}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{first?.slug || ""}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-teal-700 whitespace-nowrap">
                        {formatMoneyVND(row.total)}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-700 whitespace-nowrap">
                        <span
                          className={
                            "inline-flex items-center h-6 px-2 rounded-md border text-[11px] font-bold " +
                            badgeClassByPaymentMethod(row.payment?.method)
                          }
                        >
                          {PAYMENT_LABEL[row.payment?.method] || row.payment?.method || ""}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className={
                              "inline-flex items-center h-7 px-2.5 rounded-md border text-xs font-bold whitespace-nowrap transition hover:opacity-90 " +
                              badgeClassByStatus(row.status) +
                              (busyId === row.id ? " opacity-60 cursor-not-allowed" : "")
                            }
                            onClick={(e) => {
                              if (busyId === row.id) return;
                              openStatusMenu(row, e.currentTarget);
                            }}
                            disabled={busyId === row.id}
                            aria-haspopup="menu"
                            aria-expanded={statusMenu?.id === row.id}
                          >
                            {STATUS_LABEL[row.status] || row.status}
                            <span className="ml-1.5 text-[10px] opacity-70">▾</span>
                          </button>

                          {statusMenu?.id === row.id
                            ? createPortal(
                                <div
                                  ref={statusMenuRef}
                                  className="fixed z-[1000] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
                                  style={{ left: statusMenu.left, top: statusMenu.top, width: statusMenu.width }}
                                  role="menu"
                                >
                                  {STATUS_OPTIONS.map((opt) => {
                                    const active = opt.value === row.status;
                                    return (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        className={
                                          "w-full px-3 py-2 text-left text-sm flex items-center justify-between gap-3 " +
                                          (active ? "bg-teal-50 text-teal-800 font-semibold" : "hover:bg-gray-50 text-gray-700")
                                        }
                                        onClick={async () => {
                                          setStatusMenu(null);
                                          await onChangeStatus(row, opt.value);
                                        }}
                                        role="menuitem"
                                      >
                                        <span className="truncate">{opt.label}</span>
                                        {active ? <span className="text-teal-700">✓</span> : null}
                                      </button>
                                    );
                                  })}

                                  <div className="h-px bg-gray-100" />
                                  <button
                                    type="button"
                                    className="w-full px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50"
                                    onClick={() => setStatusMenu(null)}
                                  >
                                    Đóng
                                  </button>
                                </div>,
                                document.body,
                              )
                            : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-6 py-4 flex items-center justify-between gap-3 bg-white">
        <div className="text-sm text-gray-500">Tổng {Number(total || 0)} đơn hàng</div>

        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => {
              const next = Number(e.target.value || 10);
              setLimit(next);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-gray-200 bg-white text-sm px-3"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}/trang
              </option>
            ))}
          </select>

          <button
            type="button"
            className="w-9 h-9 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            aria-label="Trang trước"
          >
            ‹
          </button>

          {pageNumbers.map((p) => (
            <button
              key={p}
              type="button"
              className={
                "w-9 h-9 rounded-md border text-sm font-semibold " +
                (p === page
                  ? "border-blue-500 text-blue-700 hover:bg-blue-50"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50")
              }
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            className="w-9 h-9 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            aria-label="Trang sau"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrdersManagementPanel;
