import { useMemo, useState } from "react";
import { CalendarDays, CircleDollarSign, Pencil, RotateCw, Search, Tag, Trash2 } from "lucide-react";
import AdminFormModal from "../components/AdminFormModal";
import {
  createDiscountCodeApi,
  deleteDiscountCodeApi,
  updateDiscountCodeApi,
} from "../../../services/discountCode.api";
import { useAdminDiscountCodes } from "./useAdminDiscountCodes";
import { getPageNumbers } from "../shared/pagination";
import { useResultsAnimKey } from "../shared/useResultsAnimKey";

const formatNumber = (n) => {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("vi-VN");
};

const formatDateRange = (startsAt, endsAt) => {
  const s = startsAt ? new Date(startsAt) : null;
  const e = endsAt ? new Date(endsAt) : null;
  const fmt = (d) => {
    try {
      return d.toLocaleDateString("vi-VN");
    } catch {
      return "";
    }
  };

  if (!s && !e) return "—";
  if (s && !e) return `${fmt(s)} -`;
  if (!s && e) return `- ${fmt(e)}`;
  return `${fmt(s)} - ${fmt(e)}`;
};

const toLocalDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  const t = d.getTime();
  if (!Number.isFinite(t)) return "";
  const yyyy = String(d.getFullYear()).padStart(4, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};


const emptyDraft = () => ({
  code: "",
  percentOff: "10",
  remainingUses: "10",
  minOrderValue: "0",
  startsAt: "",
  endsAt: "",
  isActive: true,
});

const normalizeDraftPayload = (draft) => {
  const code = String(draft?.code || "").trim().toUpperCase();
  return {
    code,
    percentOff: Number(draft?.percentOff || 0),
    remainingUses: Number(draft?.remainingUses || 0),
    minOrderValue: Number(draft?.minOrderValue || 0),
    startsAt: draft?.startsAt ? String(draft.startsAt) : null,
    endsAt: draft?.endsAt ? String(draft.endsAt) : null,
    isActive: Boolean(draft?.isActive),
  };
};

const DiscountCodesManagementPanel = ({ toast }) => {
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
    reset,
  } = useAdminDiscountCodes({ enabled: true });

  const resultsAnimKey = useResultsAnimKey(loading, dataVersion);

  const [busyId, setBusyId] = useState("");

  const [modalMode, setModalMode] = useState(""); // create | edit
  const [modalId, setModalId] = useState("");
  const [modalDraft, setModalDraft] = useState(emptyDraft);
  const [modalError, setModalError] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const openCreate = () => {
    setModalMode("create");
    setModalId("");
    setModalDraft(emptyDraft());
    setModalError("");
  };

  const openEdit = (row) => {
    setModalMode("edit");
    setModalId(row?.id || "");
    setModalDraft({
      code: row?.code || "",
      percentOff: String(row?.percentOff ?? 0),
      remainingUses: String(row?.remainingUses ?? 0),
      minOrderValue: String(row?.minOrderValue ?? 0),
      startsAt: toLocalDateInput(row?.startsAt),
      endsAt: toLocalDateInput(row?.endsAt),
      isActive: Boolean(row?.isActive),
    });
    setModalError("");
  };

  const closeModal = () => {
    if (modalSubmitting) return;
    setModalMode("");
    setModalId("");
    setModalError("");
  };

  const columns = useMemo(
    () => ["Mã giảm giá", "Giảm giá", "Số lượng còn lại", "Thời gian", "Đơn tối thiểu", "Thao tác"],
    [],
  );

  const thClassByColumn = useMemo(() => {
    return {
      "Mã giảm giá": "w-[220px]",
      "Giảm giá": "w-[130px]",
      "Số lượng còn lại": "w-[180px]",
      "Thời gian": "w-[240px]",
      "Đơn tối thiểu": "w-[160px]",
      "Thao tác": "w-[140px]",
    };
  }, []);

  const onSubmit = async () => {
    if (modalSubmitting) return;
    setModalError("");

    const payload = normalizeDraftPayload(modalDraft);
    if (!payload.code) {
      setModalError("Mã giảm giá là bắt buộc");
      return;
    }
    if (!payload.percentOff || payload.percentOff <= 0 || payload.percentOff > 100) {
      setModalError("Giảm giá phải trong khoảng 1-100 (%)");
      return;
    }
    if (payload.remainingUses < 0 || !Number.isFinite(payload.remainingUses)) {
      setModalError("Số lượng còn lại không hợp lệ");
      return;
    }
    if (payload.minOrderValue < 0 || !Number.isFinite(payload.minOrderValue)) {
      setModalError("Đơn tối thiểu không hợp lệ");
      return;
    }

    try {
      setModalSubmitting(true);
      if (modalMode === "edit") {
        await updateDiscountCodeApi(modalId, payload);
        toast?.success?.("Đã cập nhật mã giảm giá");
      } else {
        await createDiscountCodeApi(payload);
        toast?.success?.("Đã tạo mã giảm giá");
      }
      await refresh({});
      closeModal();
    } catch (err) {
      const msg = err?.message || "Không thể lưu mã giảm giá";
      setModalError(msg);
      toast?.error?.(msg);
    } finally {
      setModalSubmitting(false);
    }
  };

  const onDelete = async (row) => {
    const ok = window.confirm(`Xoá mã giảm giá "${row?.code || ""}"?`);
    if (!ok) return;

    try {
      setBusyId(row?.id || "");
      await deleteDiscountCodeApi(row.id);
      toast?.success?.("Xoá mã giảm giá thành công");

      const isLastItemOnPage = (items || []).length <= 1 && page > 1;
      const nextPage = isLastItemOnPage ? page - 1 : page;
      await refresh({ page: nextPage });
    } catch (err) {
      toast?.error?.(err?.message || "Xoá mã giảm giá thất bại");
    } finally {
      setBusyId("");
    }
  };

  const pageNumbers = useMemo(() => getPageNumbers(page, totalPages), [page, totalPages]);

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between gap-3">
          <div className="relative w-full max-w-[360px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm kiếm theo mã..."
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
            <button
              type="button"
              className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
              onClick={openCreate}
            >
              + Thêm mã giảm giá
            </button>
          </div>
        </div>

        <div className="overflow-x-hidden">
          <div key={resultsAnimKey} className={!loading && !error ? "anim-fade-up" : ""}>
            <table className="w-full table-fixed">
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
              ) : (items || []).length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-sm text-gray-500" colSpan={columns.length}>
                    Không có mã giảm giá phù hợp.
                  </td>
                </tr>
              ) : (
                (items || []).map((row) => {
                  const disabled = busyId && String(busyId) === String(row?.id);
                  return (
                    <tr key={row.id} className={disabled ? "opacity-60" : "opacity-100"}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 inline-flex items-center justify-center">
                            <Tag size={14} />
                          </span>
                          <div className="text-sm font-semibold text-gray-900">
                            {row?.code || ""}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center h-6 px-2 rounded-md bg-orange-100 text-orange-700 font-bold">
                          {Number(row?.percentOff || 0)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-800">{Number(row?.remainingUses || 0)} lượt sử dụng</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <CalendarDays size={16} className="text-gray-400" />
                          <span>{formatDateRange(row?.startsAt, row?.endsAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                          <CircleDollarSign size={16} className="text-emerald-600" />
                          <span>{formatNumber(row?.minOrderValue || 0)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-gray-700 hover:text-blue-700"
                            onClick={() => openEdit(row)}
                            disabled={disabled}
                            title="Sửa"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="text-gray-700 hover:text-red-600"
                            onClick={() => onDelete(row)}
                            disabled={disabled}
                            title="Xoá"
                          >
                            <Trash2 size={16} />
                          </button>
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
          <div className="text-sm text-gray-500">Tổng {Number(total || 0)} mã giảm giá</div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="w-9 h-9 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
              aria-label="Trang trước"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              ‹
            </button>

            {pageNumbers.map((p) => {
              const active = p === page;
              return (
                <button
                  key={p}
                  type="button"
                  className={
                    "w-9 h-9 rounded-md border text-sm font-semibold " +
                    (active
                      ? "border-blue-500 text-blue-700 hover:bg-blue-50"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50")
                  }
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              );
            })}

            <button
              type="button"
              className="w-9 h-9 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
              aria-label="Trang sau"
              onClick={() => setPage(Math.min(totalPages || 1, page + 1))}
              disabled={page >= (totalPages || 1)}
            >
              ›
            </button>

            <select
              className="h-9 rounded-md border border-gray-200 text-sm text-gray-700 px-2 bg-white"
              value={limit}
              onChange={(e) => {
                const v = Number(e.target.value || 10);
                setLimit(v);
                setPage(1);
              }}
              aria-label="Số dòng mỗi trang"
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <AdminFormModal
        open={Boolean(modalMode)}
        title={modalMode === "edit" ? "Cập nhật mã giảm giá" : "Thêm mã giảm giá"}
        subtitle="Thiết lập % giảm, đơn tối thiểu, thời gian và số lượt sử dụng."
        error={modalError}
        onCancel={closeModal}
        onSubmit={onSubmit}
        submitting={modalSubmitting}
        submitLabel={modalMode === "edit" ? "Lưu" : "Tạo"}
        maxWidthClass="max-w-[720px]"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-semibold text-gray-700">Mã giảm giá</div>
            <input
              value={modalDraft.code}
              onChange={(e) => setModalDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))}
              placeholder="VD: TEST20252"
              className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-300"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-700">Giảm giá (%)</div>
            <input
              type="number"
              min={1}
              max={100}
              value={modalDraft.percentOff}
              onChange={(e) => setModalDraft((d) => ({ ...d, percentOff: e.target.value }))}
              className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-300"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-700">Số lượng còn lại</div>
            <input
              type="number"
              min={0}
              value={modalDraft.remainingUses}
              onChange={(e) => setModalDraft((d) => ({ ...d, remainingUses: e.target.value }))}
              className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-300"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-700">Đơn tối thiểu (đ)</div>
            <input
              type="number"
              min={0}
              value={modalDraft.minOrderValue}
              onChange={(e) => setModalDraft((d) => ({ ...d, minOrderValue: e.target.value }))}
              className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-300"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-700">Từ ngày</div>
            <input
              type="date"
              value={modalDraft.startsAt}
              onChange={(e) => setModalDraft((d) => ({ ...d, startsAt: e.target.value }))}
              className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-300"
            />
            <div className="mt-1 text-xs text-gray-500">Để trống nếu áp dụng ngay</div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-700">Đến ngày</div>
            <input
              type="date"
              value={modalDraft.endsAt}
              onChange={(e) => setModalDraft((d) => ({ ...d, endsAt: e.target.value }))}
              className="mt-1 w-full h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-300"
            />
            <div className="mt-1 text-xs text-gray-500">Để trống nếu không giới hạn</div>
          </div>

          <div className="md:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(modalDraft.isActive)}
                onChange={(e) => setModalDraft((d) => ({ ...d, isActive: e.target.checked }))}
              />
              Kích hoạt mã
            </label>
          </div>
        </div>
      </AdminFormModal>
    </>
  );
};

export default DiscountCodesManagementPanel;
