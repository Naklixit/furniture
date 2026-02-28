import React, { useMemo, useState } from "react";
import { MapPin, Pencil, Phone, RotateCw, Search, Trash2, User as UserIcon } from "lucide-react";
import { deleteUserApi, updateMeApi, updateUserRoleApi } from "../../../services/user.api";
import { useAuth } from "../../../context/useAuth";
import AdminFormModal from "../components/AdminFormModal";
import RoleSwitch from "./RoleSwitch";
import { useAdminUsers } from "./useAdminUsers";
import { getPageNumbers } from "../shared/pagination";
import { useResultsAnimKey } from "../shared/useResultsAnimKey";

const formatDate = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return "";
  }
};

const roleLabel = (role) => (role === "admin" ? "Admin" : "User");
const nextRoleForToggle = (role) => (role === "admin" ? "customer" : "admin");


const UsersManagementPanel = ({ currentUser, toast }) => {
  const { accessToken, login } = useAuth();
  const {
    loading,
    error,
    dataVersion,
    items,
    page,
    limit,
    total,
    totalPages,
    stats,
    searchInput,
    setSearchInput,
    setPage,
    setLimit,
    refresh,
    patchItem,
    patchStats,
    reset,
  } = useAdminUsers({ enabled: true });

  const [busyActionId, setBusyActionId] = useState("");

  const [editUser, setEditUser] = useState(null);
  const [editDraftPhone, setEditDraftPhone] = useState("");
  const [editDraftAddress, setEditDraftAddress] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const resultsAnimKey = useResultsAnimKey(loading, dataVersion);

  const editOpen = Boolean(editUser);

  const columns = useMemo(
    () => ["#", "Người dùng", "Liên hệ", "Quyền Admin", "Ngày tạo", "Hành động"],
    [],
  );

  const thClassByColumn = useMemo(() => {
    return {
      "#": "w-[70px]",
      "Người dùng": "w-[320px]",
      "Liên hệ": "w-[320px]",
      "Quyền Admin": "w-[200px]",
      "Ngày tạo": "w-[180px]",
      "Hành động": "w-[140px]",
    };
  }, []);

  const handleToggleRole = async (row) => {
    const myId = currentUser?.id;
    const isSelf = String(row?.id) === String(myId);
    const isTargetAdmin = row?.role === "admin";

    if (isSelf) {
      toast?.error?.("Không thể tự thay đổi quyền");
      return;
    }
    if (isTargetAdmin) {
      toast?.error?.("Không thể chỉnh quyền của Admin");
      return;
    }

    const nextRole = nextRoleForToggle(row?.role);
    const prevRole = row?.role;
    try {
      setBusyActionId(row?.id || "");
      patchItem(row.id, { role: nextRole });
      if (prevRole !== nextRole) {
        const delta = prevRole === "admin" ? -1 : nextRole === "admin" ? 1 : 0;
        if (delta) {
          patchStats((s) => ({ totalAdmins: Math.max(0, Number(s?.totalAdmins || 0) + delta) }));
        }
      }
      await updateUserRoleApi(row.id, nextRole);
      toast?.success?.("Cập nhật quyền thành công");
    } catch (err) {
      patchItem(row.id, { role: prevRole });
      if (prevRole !== nextRole) {
        const delta = prevRole === "admin" ? 1 : nextRole === "admin" ? -1 : 0;
        if (delta) {
          patchStats((s) => ({ totalAdmins: Math.max(0, Number(s?.totalAdmins || 0) + delta) }));
        }
      }
      toast?.error?.(err?.message || "Cập nhật quyền thất bại");
    } finally {
      setBusyActionId("");
    }
  };
//Call API xóa người dùng
  const handleDeleteUser = async (row) => {
    const myId = currentUser?.id;
    const isSelf = String(row?.id) === String(myId);
    const isTargetAdmin = row?.role === "admin";

    if (isSelf) {
      toast?.error?.("Không thể tự xoá tài khoản");
      return;
    }
    if (isTargetAdmin) {
      toast?.error?.("Không thể xoá Admin");
      return;
    }

    const ok = window.confirm(`Xoá người dùng "${row?.fullName || row?.email || ""}"?`);
    if (!ok) return;

    try {
      setBusyActionId(row?.id || "");
      await deleteUserApi(row.id);
      toast?.success?.("Xoá người dùng thành công");

      const isLastItemOnPage = (items || []).length <= 1 && page > 1;
      const nextPage = isLastItemOnPage ? page - 1 : page;
      await refresh({ page: nextPage });
    } catch (err) {
      toast?.error?.(err?.message || "Xoá người dùng thất bại");
    } finally {
      setBusyActionId("");
    }
  };

  const openEditModalForRow = (row) => {
    setEditError("");
    setEditSaving(false);
    setEditUser(row || null);
    setEditDraftPhone(row?.phoneNumber || "");
    setEditDraftAddress(row?.address || "");
  };

  const closeEditModal = () => {
    setEditError("");
    setEditSaving(false);
    setEditUser(null);
  };

  const handleSaveMyContact = async () => {
    if (editSaving) return;
    setEditError("");

    const digits = (editDraftPhone || "").replace(/\D/g, "");
    if (digits.length !== 0 && digits.length !== 10) {
      setEditError("Số điện thoại phải gồm đúng 10 chữ số");
      return;
    }
    try {
      setEditSaving(true);
      const res = await updateMeApi({
        phoneNumber: digits.trim(),
        address: editDraftAddress || "",
      });

      const nextUser = res?.user;
      if (nextUser) {
        login({ user: nextUser, accessToken });
      }

      await refresh({});
      toast?.success?.("Đã lưu thông tin.");
      closeEditModal();
    } catch (err) {
      const msg = err?.message || "Không thể lưu thông tin. Vui lòng thử lại.";
      setEditError(msg);
      toast?.error?.(msg);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-6 py-4">
          <div className="text-2xl font-extrabold text-teal-600 leading-none">{stats?.totalUsers ?? 0}</div>
          <div className="mt-1 text-sm text-gray-500">Tổng người dùng</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-6 py-4">
          <div className="text-2xl font-extrabold text-amber-500 leading-none">{stats?.totalAdmins ?? 0}</div>
          <div className="mt-1 text-sm text-gray-500">Admin</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between gap-3">
          <div className="relative w-full max-w-[360px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm kiếm theo tên, email, SĐT..."
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
                    Không có người dùng phù hợp.
                  </td>
                </tr>
              ) : (
                items.map((u, idx) => {
                  const myId = currentUser?.id;
                  const isSelf = String(u?.id) === String(myId);
                  const isTargetAdmin = u?.role === "admin";
                  const canMutate = !isSelf && !isTargetAdmin;
                  const hasContact = Boolean((u?.phoneNumber || "").trim()) || Boolean((u?.address || "").trim());
                  const rowBusy = busyActionId && String(busyActionId) === String(u?.id);
                  const canEditMyContact = isSelf;

                  return (
                    <React.Fragment key={u.id}>
                      <tr className="text-sm text-gray-700">
                        <td className="px-6 py-4 text-gray-500">{(page - 1) * limit + idx + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
                              <UserIcon size={16} />
                            </span>
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-800 truncate">{u.fullName}</div>
                              <div className="text-xs text-gray-500 truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {hasContact ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-gray-700">
                                <Phone size={14} className="text-gray-400" />
                                <span className={(u.phoneNumber || "").trim() ? "" : "text-gray-400"}>
                                  {(u.phoneNumber || "").trim() ? u.phoneNumber : "Chưa cập nhật"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-700">
                                <MapPin size={14} className="text-gray-400" />
                                <span className={(u.address || "").trim() ? "" : "text-gray-400"}>
                                  {(u.address || "").trim() ? u.address : "Chưa cập nhật"}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Chưa cập nhật</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <RoleSwitch
                            checked={u.role === "admin"}
                            disabled={!canMutate || rowBusy}
                            label={roleLabel(u.role)}
                            title={!canMutate ? "Không thể chỉnh quyền của Admin hoặc chính bạn" : "Đổi quyền"}
                            onClick={() => {
                              if (!canMutate || rowBusy) return;
                              handleToggleRole(u);
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 text-gray-600">{formatDate(u.createdAt)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className={
                                "w-9 h-9 rounded-md border flex items-center justify-center " +
                                (canEditMyContact
                                  ? "border-gray-200 text-gray-600 hover:bg-gray-50"
                                  : "border-gray-200 text-gray-400 cursor-not-allowed")
                              }
                              aria-label="Chỉnh sửa"
                              title={canEditMyContact ? "Chỉnh sửa thông tin liên hệ của bạn" : "Chỉ bạn mới sửa được"}
                              onClick={() => {
                                if (!canEditMyContact) return;
                                openEditModalForRow(u);
                              }}
                              aria-disabled={!canEditMyContact}
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              className={
                                "w-9 h-9 rounded-md border flex items-center justify-center " +
                                (canMutate && !rowBusy
                                  ? "border-red-200 text-red-600 hover:bg-red-50"
                                  : "border-gray-200 text-gray-400 cursor-not-allowed")
                              }
                              aria-label="Xoá"
                              title={!canMutate ? "Không thể xoá Admin hoặc chính bạn" : "Xoá"}
                              onClick={() => {
                                if (!canMutate || rowBusy) return;
                                handleDeleteUser(u);
                              }}
                              aria-disabled={!canMutate || rowBusy}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 py-4 flex items-center justify-between gap-3 bg-white">
          <div className="text-sm text-gray-500">Tổng {total} người dùng</div>

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
              className={
                "w-9 h-9 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 " +
                (page <= 1 ? "opacity-60 cursor-not-allowed" : "")
              }
              aria-label="Trang trước"
              onClick={() => {
                if (page <= 1) return;
                setPage((p) => Math.max(1, p - 1));
              }}
            >
              ‹
            </button>

            {getPageNumbers(page, totalPages).map((p) => {
              const active = p === page;
              return (
                <button
                  key={p}
                  type="button"
                  className={
                    "w-9 h-9 rounded-md border text-sm font-semibold transition-colors duration-150 " +
                    (active
                      ? "border-blue-500 text-blue-700 hover:bg-blue-50"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50")
                  }
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              );
            })}

            <button
              type="button"
              className={
                "w-9 h-9 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 " +
                (page >= totalPages ? "opacity-60 cursor-not-allowed" : "")
              }
              aria-label="Trang sau"
              onClick={() => {
                if (page >= totalPages) return;
                setPage((p) => Math.min(totalPages, p + 1));
              }}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <AdminFormModal
        open={editOpen}
        title="Cập nhật liên hệ"
        subtitle={editUser?.fullName || editUser?.email || "Tài khoản của bạn"}
        error={editError}
        onCancel={closeEditModal}
        onSubmit={handleSaveMyContact}
        submitting={editSaving}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-700">Số điện thoại</div>
            <div className="mt-1">
              <input
                value={editDraftPhone}
                onChange={(e) => {
                  const digits = (e.target.value || "").replace(/\D/g, "").slice(0, 10);
                  setEditDraftPhone(digits);
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 outline-none focus:border-gray-300"
                placeholder="Nhập số điện thoại (10 số)"
                disabled={editSaving}
              />
              <div className="mt-1 text-xs text-gray-400">Để trống nếu muốn xoá số điện thoại.</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-700">Địa chỉ</div>
            <div className="mt-1">
              <textarea
                value={editDraftAddress}
                onChange={(e) => setEditDraftAddress(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-gray-300"
                placeholder="Nhập địa chỉ"
                disabled={editSaving}
              />
            </div>
          </div>
        </div>
      </AdminFormModal>
    </>
  );
};

export default UsersManagementPanel;
