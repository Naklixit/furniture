import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, RotateCw, Search, Trash2, Image as ImageIcon, Plus, X } from "lucide-react";
import AdminFormModal from "../components/AdminFormModal";
import RoleSwitch from "../users/RoleSwitch";
import { listCategoriesApi } from "../../../services/category.api";
import {
  createProductApi,
  deleteProductApi,
  updateProductApi,
  uploadProductImagesApi,
} from "../../../services/product.api";
import { useAdminProducts } from "./useAdminProducts";

const formatMoneyVND = (n) => {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("vi-VN") + "đ";
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_GALLERY_FILES = 12;

const isImageFile = (file) => {
  return Boolean(file && /^image\//.test(file.type || ""));
};

const validateImageFiles = (files) => {
  const arr = Array.isArray(files) ? files : [];
  if (arr.length === 0) return { ok: true, files: [] };

  for (const f of arr) {
    if (!isImageFile(f)) {
      return { ok: false, message: "Chỉ hỗ trợ file ảnh" };
    }
    if (typeof f.size === "number" && f.size > MAX_IMAGE_BYTES) {
      return { ok: false, message: "Mỗi bức ảnh tối đa 10MB" };
    }
  }
  return { ok: true, files: arr };
};

const uniqBySignature = (files) => {
  const seen = new Set();
  const out = [];
  for (const f of files || []) {
    const sig = `${f?.name || ""}|${f?.size || 0}|${f?.lastModified || 0}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(f);
  }
  return out;
};

const getPageNumbers = (page, totalPages) => {
  const total = Math.max(1, totalPages || 1);
  const current = Math.min(Math.max(1, page || 1), total);
  const windowSize = 5;
  const half = Math.floor(windowSize / 2);

  let start = Math.max(1, current - half);
  let end = Math.min(total, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  const pages = [];
  for (let i = start; i <= end; i += 1) pages.push(i);
  return pages;
};

const defaultExtraRow = () => ({ key: "", value: "" });

const emptyDraft = () => ({
  name: "",
  slug: "",
  categoryId: "",
  brand: "",
  originalPrice: "0",
  salePrice: "0",
  stock: "0",
  description: "",
  length: "0",
  width: "0",
  height: "0",
  dimensionUnit: "cm",
  weight: "0",
  weightUnit: "kg",
  extraRows: [defaultExtraRow()],
  isActive: true,
  mainImage: null,
  galleryImages: [],
  existingMainUrl: "",
  existingGalleryUrls: [],
});

const buildSpecsExtraJson = (extraRows) => {
  const obj = {};
  (extraRows || []).forEach((r) => {
    const k = (r?.key || "").trim();
    const v = (r?.value || "").trim();
    if (!k) return;
    obj[k] = v;
  });
  return JSON.stringify(obj);
};

const mapExtraRowsFromProduct = (product) => {
  const extra = product?.specs?.extra;
  if (!extra) return [defaultExtraRow()];

  // extra could be object or Map-like
  const entries =
    extra instanceof Map
      ? Array.from(extra.entries())
      : typeof extra === "object"
        ? Object.entries(extra)
        : [];

  if (!entries.length) return [defaultExtraRow()];
  return entries.map(([k, v]) => ({ key: String(k), value: String(v ?? "") }));
};

const ProductsManagementPanel = ({ toast }) => {
  const {
    loading,
    error,
    dataVersion,
    items,
    page,
    limit,
    totalPages,
    searchInput,
    setSearchInput,
    setPage,
    refresh,
    patchItem,
    reset,
  } = useAdminProducts({ enabled: true });

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const [busyId, setBusyId] = useState("");

  const [modalMode, setModalMode] = useState(""); // create | edit
  const [modalId, setModalId] = useState("");
  const [modalDraft, setModalDraft] = useState(emptyDraft);
  const [modalError, setModalError] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const mainInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [mainPreviewUrl, setMainPreviewUrl] = useState("");
  const [galleryPreviewUrls, setGalleryPreviewUrls] = useState([]);

  const [resultsAnimKey, setResultsAnimKey] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!dataVersion) return;
    setResultsAnimKey((k) => k + 1);
  }, [loading, dataVersion]);

  const openCreate = () => {
    setModalMode("create");
    setModalId("");
    setModalDraft((d) => ({ ...emptyDraft(), categoryId: categories?.[0]?.id || "" }));
    setModalError("");
  };

  const openEdit = (p) => {
    setModalMode("edit");
    setModalId(p?.id || "");

    setModalDraft({
      name: p?.name || "",
      slug: p?.slug || "",
      categoryId: p?.categoryId || "",
      brand: p?.brand || "",
      originalPrice: String(p?.originalPrice ?? 0),
      salePrice: String(p?.salePrice ?? 0),
      stock: String(p?.stock ?? 0),
      description: p?.description || "",
      length: String(p?.specs?.dimensions?.length ?? 0),
      width: String(p?.specs?.dimensions?.width ?? 0),
      height: String(p?.specs?.dimensions?.height ?? 0),
      dimensionUnit: p?.specs?.dimensions?.unit || "cm",
      weight: String(p?.specs?.weight?.value ?? 0),
      weightUnit: p?.specs?.weight?.unit || "kg",
      extraRows: mapExtraRowsFromProduct(p),
      isActive: Boolean(p?.isActive),
      mainImage: null,
      galleryImages: [],
      existingMainUrl: p?.images?.main?.url || "",
      existingGalleryUrls: (p?.images?.gallery || []).map((g) => g?.url).filter(Boolean),
    });
    setModalError("");
  };

  const closeModal = () => {
    if (modalSubmitting) return;
    setModalMode("");
    setModalId("");
    setModalError("");
  };

  // Manage preview object URLs
  useEffect(() => {
    setMainPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setGalleryPreviewUrls((prev) => {
      (prev || []).forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {
          // ignore
        }
      });
      return [];
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalMode]);

  useEffect(() => {
    // main preview
    setMainPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return modalDraft?.mainImage ? URL.createObjectURL(modalDraft.mainImage) : "";
    });

    // gallery previews
    setGalleryPreviewUrls((prev) => {
      (prev || []).forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {
          // ignore
        }
      });
      const nextFiles = modalDraft?.galleryImages || [];
      return nextFiles.map((f) => URL.createObjectURL(f));
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalDraft.mainImage, modalDraft.galleryImages]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setCategoriesLoading(true);
        const res = await listCategoriesApi({ page: 1, limit: 100, includeHidden: true });
        if (!mounted) return;
        setCategories(res?.items || []);
      } catch {
        // ignore (product can still be edited without changing category)
      } finally {
        if (!mounted) return;
        setCategoriesLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const columns = useMemo(
    () => ["#", "Sản phẩm", "Danh mục", "Giá", "Kho", "Trạng thái", "Hành động"],
    [],
  );

  const thClassByColumn = useMemo(() => {
    return {
      "#": "w-[70px]",
      "Sản phẩm": "w-[380px]",
      "Danh mục": "w-[180px]",
      "Giá": "w-[160px]",
      "Kho": "w-[100px]",
      "Trạng thái": "w-[190px]",
      "Hành động": "w-[140px]",
    };
  }, []);

  const onToggleActive = async (row) => {
    const prev = Boolean(row?.isActive);
    const next = !prev;
    try {
      setBusyId(row?.id || "");
      patchItem(row.id, { isActive: next });
      await updateProductApi(row.id, { isActive: next });
    } catch (err) {
      patchItem(row.id, { isActive: prev });
      toast?.error?.(err?.message || "Không thể cập nhật trạng thái");
    } finally {
      setBusyId("");
    }
  };

  const onDelete = async (row) => {
    const ok = window.confirm(`Xoá sản phẩm "${row?.name || ""}"?`);
    if (!ok) return;

    try {
      setBusyId(row?.id || "");
      await deleteProductApi(row.id);
      toast?.success?.("Xoá sản phẩm thành công");

      const isLastItemOnPage = (items || []).length <= 1 && page > 1;
      const nextPage = isLastItemOnPage ? page - 1 : page;
      await refresh({ page: nextPage });
    } catch (err) {
      toast?.error?.(err?.message || "Xoá sản phẩm thất bại");
    } finally {
      setBusyId("");
    }
  };

  const onSubmit = async () => {
    if (modalSubmitting) return;
    setModalError("");

    const name = (modalDraft.name || "").trim();
    const categoryId = (modalDraft.categoryId || "").trim();

    if (!name) {
      setModalError("Tên sản phẩm là bắt buộc");
      return;
    }
    if (!categoryId) {
      setModalError("Vui lòng chọn danh mục");
      return;
    }

    const originalPrice = Number(modalDraft.originalPrice);
    const salePrice = Number(modalDraft.salePrice);
    const stock = Number(modalDraft.stock);

    const length = Number(modalDraft.length);
    const width = Number(modalDraft.width);
    const height = Number(modalDraft.height);
    const weight = Number(modalDraft.weight);

    const numberFields = [
      { v: originalPrice, msg: "Giá gốc không hợp lệ" },
      { v: salePrice, msg: "Giá khuyến mãi không hợp lệ" },
      { v: stock, msg: "Tồn kho không hợp lệ" },
      { v: length, msg: "Chiều dài không hợp lệ" },
      { v: width, msg: "Chiều ngang không hợp lệ" },
      { v: height, msg: "Chiều cao không hợp lệ" },
      { v: weight, msg: "Trọng lượng không hợp lệ" },
    ];

    for (const f of numberFields) {
      if (!Number.isFinite(f.v) || f.v < 0) {
        setModalError(f.msg);
        return;
      }
    }

    if (salePrice > originalPrice) {
      setModalError("Giá khuyến mãi không được lớn hơn giá gốc");
      return;
    }

    const specsExtra = buildSpecsExtraJson(modalDraft.extraRows);

    const payload = {
      name,
      slug: (modalDraft.slug || "").trim(),
      categoryId,
      brand: (modalDraft.brand || "").trim(),
      originalPrice,
      salePrice,
      stock,
      description: modalDraft.description || "",
      length,
      width,
      height,
      dimensionUnit: modalDraft.dimensionUnit || "cm",
      weight,
      weightUnit: modalDraft.weightUnit || "kg",
      specsExtra,
      isActive: Boolean(modalDraft.isActive),
    };

    const hasAnyImages = Boolean(modalDraft.mainImage || (modalDraft.galleryImages || []).length);
    if (hasAnyImages) {
      const mainValidation = validateImageFiles(modalDraft.mainImage ? [modalDraft.mainImage] : []);
      if (!mainValidation.ok) {
        setModalError(mainValidation.message);
        return;
      }

      const galleryValidation = validateImageFiles(modalDraft.galleryImages || []);
      if (!galleryValidation.ok) {
        setModalError(galleryValidation.message);
        return;
      }

      if (!modalDraft.mainImage) {
        setModalError("Cần chọn ảnh main");
        return;
      }
      if ((modalDraft.galleryImages || []).length < 3) {
        setModalError("Cần ít nhất 3 ảnh gallery");
        return;
      }

      if ((modalDraft.galleryImages || []).length > MAX_GALLERY_FILES) {
        setModalError(`Tối đa ${MAX_GALLERY_FILES} ảnh gallery`);
        return;
      }
    }

    try {
      setModalSubmitting(true);

      let productId = modalId;
      if (modalMode === "edit") {
        const res = await updateProductApi(modalId, payload);
        productId = res?.product?.id || modalId;
      } else {
        const res = await createProductApi(payload);
        productId = res?.product?.id;
      }

      if (hasAnyImages && productId) {
        await uploadProductImagesApi({
          productId,
          mainImage: modalDraft.mainImage,
          galleryImages: modalDraft.galleryImages,
        });
      }

      await refresh({});
      closeModal();

      toast?.success?.(
        modalMode === "edit" ? "Cập nhật sản phẩm thành công" : "Tạo sản phẩm thành công",
      );
    } catch (err) {
      const msg = err?.message || "Không thể lưu sản phẩm";
      setModalError(msg);
      toast?.error?.(msg);
    } finally {
      setModalSubmitting(false);
    }
  };

  const pageNumbers = useMemo(() => getPageNumbers(page, totalPages), [page, totalPages]);

  const categoryLabelById = useMemo(() => {
    const map = new Map();
    (categories || []).forEach((c) => map.set(String(c.id), c.name));
    return (id) => map.get(String(id)) || "";
  }, [categories]);

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
              placeholder="Tìm kiếm sản phẩm..."
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
              disabled={categoriesLoading}
              title={categoriesLoading ? "Đang tải danh mục..." : ""}
            >
              + Thêm sản phẩm
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
                    Không có sản phẩm phù hợp.
                  </td>
                </tr>
              ) : (
                (items || []).map((row, idx) => {
                  const busy = busyId && String(busyId) === String(row?.id);

                  const price =
                    Number(row?.salePrice || 0) > 0
                      ? formatMoneyVND(row.salePrice)
                      : formatMoneyVND(row.originalPrice);

                  const categoryName = row?.category?.name || categoryLabelById(row?.categoryId) || "";

                  return (
                    <tr key={row.id} className={busy ? "opacity-60" : "opacity-100"}>
                      <td className="px-6 py-4 text-sm text-gray-500">{(page - 1) * limit + idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
                            {row?.images?.main?.url ? (
                              <img src={row.images.main.url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon size={16} className="text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{row.name}</div>
                            <div className="text-xs text-gray-500 truncate">{row.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{categoryName}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{price}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.stock}</td>
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

        <div className="px-6 py-4 flex items-center justify-end gap-2 bg-white">
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

      <AdminFormModal
        open={Boolean(modalMode)}
        title={modalMode === "edit" ? "Cập nhật sản phẩm" : "Thêm mới sản phẩm"}
        subtitle={modalMode === "edit" ? "Chỉnh sửa thông tin sản phẩm" : "Tạo sản phẩm mới"}
        error={modalError}
        submitting={modalSubmitting}
        submitLabel={modalMode === "edit" ? "Lưu thay đổi" : "Tạo sản phẩm"}
        onCancel={closeModal}
        onSubmit={onSubmit}
        maxWidthClass="max-w-4xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800">Tên sản phẩm *</label>
            <input
              className="mt-2 w-full h-10 px-3 rounded-xl border border-gray-200 outline-none focus:border-gray-300"
              value={modalDraft.name}
              onChange={(e) => setModalDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Nhập tên sản phẩm"
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

          <div>
            <label className="block text-sm font-semibold text-gray-800">Danh mục *</label>
            <select
              className="mt-2 w-full h-10 px-3 rounded-xl border border-gray-200 outline-none focus:border-gray-300 bg-white"
              value={modalDraft.categoryId}
              onChange={(e) => setModalDraft((d) => ({ ...d, categoryId: e.target.value }))}
            >
              {(categories || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800">Thương hiệu</label>
            <input
              className="mt-2 w-full h-10 px-3 rounded-xl border border-gray-200 outline-none focus:border-gray-300"
              value={modalDraft.brand}
              onChange={(e) => setModalDraft((d) => ({ ...d, brand: e.target.value }))}
              placeholder="Ví dụ: Nội thất ABC"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800">Giá gốc *</label>
            <input
              type="number"
              min="0"
              className="mt-2 w-full h-10 px-3 rounded-xl border border-gray-200 outline-none focus:border-gray-300"
              value={modalDraft.originalPrice}
              onChange={(e) => setModalDraft((d) => ({ ...d, originalPrice: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800">Giá khuyến mãi</label>
            <input
              type="number"
              min="0"
              className="mt-2 w-full h-10 px-3 rounded-xl border border-gray-200 outline-none focus:border-gray-300"
              value={modalDraft.salePrice}
              onChange={(e) => setModalDraft((d) => ({ ...d, salePrice: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800">Tồn kho *</label>
            <input
              type="number"
              min="0"
              className="mt-2 w-full h-10 px-3 rounded-xl border border-gray-200 outline-none focus:border-gray-300"
              value={modalDraft.stock}
              onChange={(e) => setModalDraft((d) => ({ ...d, stock: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800">Trạng thái</label>
            <div className="mt-3">
              <RoleSwitch
                checked={Boolean(modalDraft.isActive)}
                onClick={() => setModalDraft((d) => ({ ...d, isActive: !d.isActive }))}
                label={modalDraft.isActive ? "Hiển thị" : "Ẩn"}
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-800">Mô tả chi tiết</label>
          <textarea
            className="mt-2 w-full min-h-[110px] px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-gray-300"
            value={modalDraft.description}
            onChange={(e) => setModalDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Nhập mô tả sản phẩm"
          />
        </div>

        <div className="mt-6 border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-800">Thông số kỹ thuật</div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800">Chiều dài *</label>
              <input
                type="number"
                min="0"
                className="mt-2 w-full h-10 px-3 rounded-xl border border-gray-200 outline-none focus:border-gray-300"
                value={modalDraft.length}
                onChange={(e) => setModalDraft((d) => ({ ...d, length: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800">Chiều ngang *</label>
              <input
                type="number"
                min="0"
                className="mt-2 w-full h-10 px-3 rounded-xl border border-gray-200 outline-none focus:border-gray-300"
                value={modalDraft.width}
                onChange={(e) => setModalDraft((d) => ({ ...d, width: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800">Chiều cao *</label>
              <input
                type="number"
                min="0"
                className="mt-2 w-full h-10 px-3 rounded-xl border border-gray-200 outline-none focus:border-gray-300"
                value={modalDraft.height}
                onChange={(e) => setModalDraft((d) => ({ ...d, height: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800">Đơn vị</label>
              <select
                className="mt-2 w-full h-10 px-3 rounded-xl border border-gray-200 outline-none focus:border-gray-300 bg-white"
                value={modalDraft.dimensionUnit}
                onChange={(e) => setModalDraft((d) => ({ ...d, dimensionUnit: e.target.value }))}
              >
                <option value="cm">cm</option>
                <option value="mm">mm</option>
                <option value="m">m</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800">Trọng lượng</label>
              <input
                type="number"
                min="0"
                className="mt-2 w-full h-10 px-3 rounded-xl border border-gray-200 outline-none focus:border-gray-300"
                value={modalDraft.weight}
                onChange={(e) => setModalDraft((d) => ({ ...d, weight: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800">Đơn vị</label>
              <select
                className="mt-2 w-full h-10 px-3 rounded-xl border border-gray-200 outline-none focus:border-gray-300 bg-white"
                value={modalDraft.weightUnit}
                onChange={(e) => setModalDraft((d) => ({ ...d, weightUnit: e.target.value }))}
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
              </select>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="text-sm font-semibold text-gray-800">Thông số khác (tuỳ chọn)</div>
            <div className="mt-2 space-y-2">
              {(modalDraft.extraRows || []).map((r, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  <input
                    className="md:col-span-5 h-10 px-3 rounded-xl border border-gray-200 outline-none focus:border-gray-300"
                    placeholder="Tên thuộc tính (ví dụ: Chất liệu)"
                    value={r.key}
                    onChange={(e) =>
                      setModalDraft((d) => {
                        const next = [...(d.extraRows || [])];
                        next[idx] = { ...next[idx], key: e.target.value };
                        return { ...d, extraRows: next };
                      })
                    }
                  />
                  <input
                    className="md:col-span-6 h-10 px-3 rounded-xl border border-gray-200 outline-none focus:border-gray-300"
                    placeholder="Giá trị (ví dụ: Gỗ sồi)"
                    value={r.value}
                    onChange={(e) =>
                      setModalDraft((d) => {
                        const next = [...(d.extraRows || [])];
                        next[idx] = { ...next[idx], value: e.target.value };
                        return { ...d, extraRows: next };
                      })
                    }
                  />
                  <div className="md:col-span-1 flex items-center justify-end">
                    <button
                      type="button"
                      className="h-10 px-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                      onClick={() =>
                        setModalDraft((d) => {
                          const next = [...(d.extraRows || [])];
                          next.splice(idx, 1);
                          if (!next.length) next.push(defaultExtraRow());
                          return { ...d, extraRows: next };
                        })
                      }
                    >
                      −
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="h-10 px-4 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                onClick={() => setModalDraft((d) => ({ ...d, extraRows: [...(d.extraRows || []), defaultExtraRow()] }))}
              >
                + Thêm thông số
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-sm font-semibold text-gray-800">Hình ảnh sản phẩm</div>

          {modalMode === "edit" && (modalDraft.existingMainUrl || (modalDraft.existingGalleryUrls || []).length) ? (
            <div className="mt-3 p-4 rounded-2xl border border-gray-200 bg-gray-50">
              <div className="text-xs font-semibold text-gray-700">Ảnh hiện tại</div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="md:col-span-2">
                  <div className="text-[11px] text-gray-500 mb-1">Main</div>
                  <div className="w-full aspect-square rounded-2xl bg-white border border-gray-200 overflow-hidden flex items-center justify-center">
                    {modalDraft.existingMainUrl ? (
                      <img src={modalDraft.existingMainUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={18} className="text-gray-400" />
                    )}
                  </div>
                </div>
                <div className="md:col-span-4">
                  <div className="text-[11px] text-gray-500 mb-1">Gallery</div>
                  <div className="grid grid-cols-4 gap-3">
                    {(modalDraft.existingGalleryUrls || []).slice(0, 8).map((url) => (
                      <div
                        key={url}
                        className="w-full aspect-square rounded-2xl bg-white border border-gray-200 overflow-hidden"
                        title="Ảnh hiện tại"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {(modalDraft.existingGalleryUrls || []).length > 8 ? (
                      <div className="w-full aspect-square rounded-2xl border border-gray-200 bg-white flex items-center justify-center text-xs text-gray-500">
                        +{(modalDraft.existingGalleryUrls || []).length - 8}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-600">
                Nếu bạn chọn ảnh mới bên dưới, hệ thống sẽ thay toàn bộ ảnh cũ.
              </div>
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-800">Ảnh main</div>
                {modalDraft.mainImage ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                    onClick={() => setModalDraft((d) => ({ ...d, mainImage: null }))}
                  >
                    Xoá ảnh
                  </button>
                ) : null}
              </div>

              <input
                ref={mainInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (!f) return;

                  const v = validateImageFiles([f]);
                  if (!v.ok) {
                    setModalError(v.message);
                    e.target.value = "";
                    return;
                  }

                  setModalError("");
                  setModalDraft((d) => ({ ...d, mainImage: f }));

                  // allow selecting the same file again
                  e.target.value = "";
                }}
              />

              <button
                type="button"
                className="mt-2 w-full max-w-[220px] aspect-square rounded-2xl border border-dashed border-gray-300 bg-white hover:bg-gray-50 transition flex items-center justify-center overflow-hidden"
                onClick={() => mainInputRef.current?.click()}
                title="Chọn ảnh main"
              >
                {mainPreviewUrl ? (
                  <img src={mainPreviewUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-600">
                    <div className="w-12 h-12 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center">
                      <Plus size={18} className="text-gray-500" />
                    </div>
                    <div className="mt-2 text-xs font-semibold">Upload</div>
                  </div>
                )}
              </button>
              <div className="mt-1 text-xs text-gray-500">Chọn 1 ảnh đại diện (main).</div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-800">Gallery (tối thiểu 3 ảnh)</div>
                {(modalDraft.galleryImages || []).length ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                    onClick={() => setModalDraft((d) => ({ ...d, galleryImages: [] }))}
                  >
                    Xoá tất cả
                  </button>
                ) : null}
              </div>

              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  const v = validateImageFiles(files);
                  if (!v.ok) {
                    setModalError(v.message);
                    e.target.value = "";
                    return;
                  }

                  setModalError("");
                  setModalDraft((d) => {
                    const prev = d.galleryImages || [];
                    const combined = uniqBySignature([...prev, ...v.files]);
                    const next = combined.slice(0, MAX_GALLERY_FILES);
                    return { ...d, galleryImages: next };
                  });

                  // allow selecting the same file again
                  e.target.value = "";
                }}
              />

              <div className="mt-2 grid grid-cols-4 gap-3">
                <button
                  type="button"
                  className="w-full aspect-square rounded-2xl border border-dashed border-gray-300 bg-white hover:bg-gray-50 transition flex items-center justify-center"
                  onClick={() => galleryInputRef.current?.click()}
                  title="Chọn ảnh gallery"
                >
                  <div className="flex flex-col items-center justify-center text-gray-600">
                    <div className="w-10 h-10 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center">
                      <Plus size={18} className="text-gray-500" />
                    </div>
                    <div className="mt-1 text-[11px] font-semibold">Upload</div>
                  </div>
                </button>

                {(galleryPreviewUrls || []).slice(0, 11).map((url, idx) => (
                  <div key={url} className="relative w-full aspect-square rounded-2xl border border-gray-200 bg-white overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/55 hover:bg-black/70 text-white flex items-center justify-center"
                      title="Xoá ảnh"
                      onClick={() =>
                        setModalDraft((d) => {
                          const next = [...(d.galleryImages || [])];
                          next.splice(idx, 1);
                          return { ...d, galleryImages: next };
                        })
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {(galleryPreviewUrls || []).length > 11 ? (
                  <div className="w-full aspect-square rounded-2xl border border-gray-200 bg-white flex items-center justify-center text-xs text-gray-500">
                    +{galleryPreviewUrls.length - 11}
                  </div>
                ) : null}
              </div>

              <div className="mt-1 text-xs text-gray-500">Gợi ý: 3–6 góc nhìn.</div>
            </div>
          </div>
        </div>
      </AdminFormModal>
    </>
  );
};

export default ProductsManagementPanel;
