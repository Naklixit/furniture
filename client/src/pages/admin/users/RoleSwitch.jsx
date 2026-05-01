import React from "react";

const RoleSwitch = ({ checked, disabled, onClick, label, title, labelClassName = "" }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 select-none transition " +
        (disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer")
      }
      title={title}
    >
      <span
        className={
          "relative inline-flex w-11 h-6 items-center rounded-full border transition-colors " +
          (checked ? "bg-blue-600 border-blue-600" : "bg-gray-100 border-gray-200")
        }
      >
        <span
          className={
            "inline-block w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 " +
            (checked ? "translate-x-5" : "translate-x-0.5")
          }
        />
      </span>
      <span
        className={
          "inline-block min-w-[64px] text-left text-xs font-semibold " +
          (checked ? "text-blue-700" : "text-gray-600") +
          (labelClassName ? ` ${labelClassName}` : "")
        }
      >
        {label}
      </span>
    </button>
  );
};

export default RoleSwitch;
