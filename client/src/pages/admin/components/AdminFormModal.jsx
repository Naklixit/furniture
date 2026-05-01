import React, { useMemo } from "react";
import AdminModal from "./AdminModal";

const AdminFormModal = ({
  open,
  title,
  subtitle,
  error,
  children,
  onCancel,
  onSubmit,
  submitting = false,
  submitLabel = "Lưu thay đổi",
  cancelLabel = "Hủy",
  disableCloseWhileSubmitting = true,
  maxWidthClass,
}) => {
  const canClose = !disableCloseWhileSubmitting || !submitting;

  const footer = useMemo(() => {
    return (
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          className="h-10 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700"
          onClick={onCancel}
          disabled={!canClose}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={
            "h-10 px-5 rounded-xl text-sm font-semibold text-white " +
            (submitting ? "bg-blue-600/60 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700")
          }
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? "Đang lưu..." : submitLabel}
        </button>
      </div>
    );
  }, [cancelLabel, canClose, onCancel, onSubmit, submitLabel, submitting]);

  return (
    <AdminModal
      open={open}
      title={title}
      subtitle={subtitle}
      onClose={() => {
        if (!canClose) return;
        onCancel?.();
      }}
      footer={footer}
      maxWidthClass={maxWidthClass}
    >
      {error ? (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm">
          {error}
        </div>
      ) : null}
      {children}
    </AdminModal>
  );
};

export default AdminFormModal;
