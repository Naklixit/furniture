import { useMemo, useState } from "react";
import { Pencil, RotateCw, Search, Trash2 } from "lucide-react";
import AdminFormModal from "../components/AdminFormModal";
import RoleSwitch from "../users/RoleSwitch";
import { createCategoryApi, deleteCategoryApi, updateCategoryApi } from "../../../services/category.api";
import { useAdminCategories } from "./useAdminCategories";
import { getPageNumbers } from "../shared/pagination";
import { useResultsAnimKey } from "../shared/useResultsAnimKey";

const emptyDraft = () => ({ name: "", slug: "", description: "", isActive: true });

const CategoriesManagementPanel = ({ toast }) => {
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
  } = useAdminCategories({ enabled: true });

  const resultsAnimKey = useResultsAnimKey(loading, dataVersion);

  const [busyId, setBusyId] = useState("");

  const [modalMode, setModalMode] = useState(""); // create | edit
  const [modalDraft, setModalDraft] = useState(emptyDraft);
  const [modalId, setModalId] = useState("");
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
      name: row?.name || "",
      slug: row?.slug || "",
      description: row?.description || "",
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
    () => ["#", "Danh mục", "Slug", "Mô tả", "Trạng thái", "Hành động"],
    [],
  );

  const thClassByColumn = useMemo(() => {
    return {
      "#": "w-[70px]",
      "Danh mục": "w-[260px]",
      "Slug": "w-[220px]",
      "Mô tả": "w-[360px]",
      "Trạng thái": "w-[190px]",
      "Hành động": "w-[140px]",
    };
  }, []);

  const onSubmit = async () => {
    if (modalSubmitting) return;
    setModalError("");

    const payload = {
      name: (modalDraft.name || "").trim(),
      slug: (modalDraft.slug || "").trim(),
      description: modalDraft.description || "",
      isActive: Boolean(modalDraft.isActive),
    };

    if (!payload.name) {
      setModalError("Tên danh mục là bắt buộc");
      return;
    }

    try {
      setModalSubmitting(true);
      if (modalMode === "edit") {
        await updateCategoryApi(modalId, payload);
        toast?.success?.("Đã cập nhật danh mục");
      } else {
        await createCategoryApi(payload);
        toast?.success?.("Đã tạo danh mục");
      }
      await refresh({});
      closeModal();
    } catch (err) {
      const msg = err?.message || "Không thể lưu danh mục";
      setModalError(msg);
      toast?.error?.(msg);
    } finally {
      setModalSubmitting(false);
    }
  };

  const onDelete = async (row) => {
    const ok = window.confirm(`Xoá danh mục "${row?.name || ""}"?`);
    if (!ok) return;

    try {
      setBusyId(row?.id || "");
      await deleteCategoryApi(row.id);
      toast?.success?.("Xoá danh mục thành công");

      const isLastItemOnPage = (items || []).length <= 1 && page > 1;
      const nextPage = isLastItemOnPage ? page - 1 : page;
      await refresh({ page: nextPage });
    } catch (err) {
      toast?.error?.(err?.message || "Xoá danh mục thất bại");
    } finally {
      setBusyId("");
    }
  };

  const onToggleActive = async (row) => {
    const prev = Boolean(row?.isActive);
    const next = !prev;
    try {
      setBusyId(row?.id || "");
      patchItem(row.id, { isActive: next });
      await updateCategoryApi(row.id, { isActive: next });
    } catch (err) {
      patchItem(row.id, { isActive: prev });
      toast?.error?.(err?.message || "Không thể cập nhật trạng thái");
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
              placeholder="Tìm kiếm danh mục..."
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
              + Thêm danh mục
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
              <tbody
                className={
                  "divide-y divide-gray-100 " +
                  (loading ? "opacity-60" : "opacity-100")
                }
              >
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
                    Không có danh mục phù hợp.
                  </td>
                </tr>
              ) : (
                (items || []).map((row, idx) => {
                  const busy = busyId && String(busyId) === String(row?.id);
                  return (
                    <tr key={row.id} className={busy ? "opacity-60" : "opacity-100"}>
                      <td className="px-6 py-4 text-sm text-gray-500">{(page - 1) * limit + idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">{row.name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{row.slug}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{row.description || ""}</td>
                      <td className="px-6 py-4">
                        <RoleSwitch
                          checked={Boolean(row.isActive)}
                          disabled={busy}
                          onClick={() => onToggleActive(row)}
                          label={row.isActive ? "Hiển thị" : "Ẩn"}
                          title="Bật/tắt hiển thị"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-gray-700 hover:text-blue-700"
                            title="Sửa"
                            onClick={() => openEdit(row)}
                            disabled={busy}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="text-gray-700 hover:text-red-600"
                            title="Xoá"
                            onClick={() => onDelete(row)}
                            disabled={busy}
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
          <div className="text-sm text-gray-500">Tổng {Number(total || 0)} danh mục</div>

          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-md border border-gray-200 text-sm text-gray-700 px-2 bg-white"
              value={limit}
              onChange={(e) => {
                const next = Number(e.target.value) || 10;
                setLimit(next);
                setPage(1);
              }}
              aria-label="Số dòng mỗi trang"
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>

            <button
              type="button"
              className="w-9 h-9 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
              aria-label="Trang trước"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ‹
            </button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                type="button"
                className={
                  "w-9 h-9 rounded-md border " +
                  (p === page
                    ? "border-blue-500 text-blue-700 font-semibold hover:bg-blue-50"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50")
                }
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="w-9 h-9 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
              aria-label="Trang sau"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <AdminFormModal
        open={Boolean(modalMode)}
        title={modalMode === "edit" ? "Cập nhật danh mục" : "Thêm mới danh mục"}
        subtitle={modalMode === "edit" ? "Chỉnh sửa thông tin danh mục" : "Tạo danh mục mới"}
        error={modalError}
        submitting={modalSubmitting}
        submitLabel={modalMode === "edit" ? "Lưu thay đổi" : "Tạo danh mục"}
        onCancel={closeModal}
        onSubmit={onSubmit}
        maxWidthClass="max-w-2xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800">Tên danh mục *</label>
            <input
              className="mt-2 w-full h-10 px-3 rounded-xl border border-gray-200 outline-none focus:border-gray-300"
              value={modalDraft.name}
              onChange={(e) => setModalDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Ví dụ: Sofa, Bàn ghế, Tủ kệ..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800">Slug (URL)</label>
            <input
              className="mt-2 w-full h-10 px-3 rounded-xl border border-gray-200 outline-none focus:border-gray-300"
              value={modalDraft.slug}
              onChange={(e) => setModalDraft((d) => ({ ...d, slug: e.target.value }))}
              placeholder="Để trống sẽ tự tạo theo tên"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-800">Mô tả</label>
          <textarea
            className="mt-2 w-full min-h-[92px] px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-gray-300"
            value={modalDraft.description}
            onChange={(e) => setModalDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Mô tả ngắn (tuỳ chọn)"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-800">Trạng thái</label>
          <div className="mt-2">
            <RoleSwitch
              checked={Boolean(modalDraft.isActive)}
              onClick={() => setModalDraft((d) => ({ ...d, isActive: !d.isActive }))}
              label={modalDraft.isActive ? "Hiển thị" : "Ẩn"}
            />
          </div>
        </div>
      </AdminFormModal>
    </>
  );
};

export default CategoriesManagementPanel;
