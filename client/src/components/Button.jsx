import { Link } from "react-router-dom";

const Button = ({
  children,
  variant = "primary",
  onClick,
  type = "button",
  to,
  disabled = false,
  loading = false,
  className: classNameProp = "",
}) => {
  const isDisabled = disabled || loading;

  const baseStyle =
    "block w-full py-3 rounded-md font-bold text-center transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-[0.99]";
  
  const variants = {
    // Nút màu xanh đậm (Đăng nhập)
    primary: "bg-teal-600 hover:bg-teal-700 text-white font-semibold",
    // Nút màu xanh nhạt (Tạo tài khoản)
    secondary: "bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold",
    // Kiểu nút cho thẻ Đăng ký
    signup: "bg-[#42aaf5] hover:bg-[#808080] text-[#000000] font-semibold rounded-lg py-4",
  };

  const spinnerClassName = (() => {
    // Tạm chọn màu spinner theo từng variant
    if (variant === "primary") return "border-white/70 border-t-transparent";
    if (variant === "secondary") return "border-blue-600/60 border-t-transparent";
    if (variant === "signup") return "border-[#2563EB]/60 border-t-transparent";
    return "border-white/70 border-t-transparent";
  })();

  const className = `${baseStyle} ${variants[variant] || ""}${isDisabled ? " opacity-70 pointer-events-none" : ""}${classNameProp ? ` ${classNameProp}` : ""}`;

  const content = (
    <span className="inline-flex items-center justify-center gap-2">
      {loading ? (
        <span
          className={`inline-block h-4 w-4 animate-spin rounded-full border-2 ${spinnerClassName}`}
          aria-hidden="true"
        />
      ) : null}
      <span className={loading ? "opacity-90" : ""}>{children}</span>
    </span>
  );

  if (to) {
    if (isDisabled) {
      return (
        <span className={className} aria-disabled="true">
          {content}
        </span>
      );
    }

    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={isDisabled}
    >
      {content}
    </button>
  );
};

export default Button;