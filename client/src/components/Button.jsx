import { Link } from "react-router-dom";

const Button = ({
  children,
  variant = "primary",
  onClick,
  type = "button",
  to,
  disabled = false,
  className: classNameProp = "",
}) => {
  const baseStyle = "block w-full py-3 rounded-md font-bold transition-colors duration-200 text-center";
  
  const variants = {
    // Nút màu xanh đậm (Log in)
    primary: "bg-blue-600 hover:bg-blue-700 text-white font-bold",
    // Nút màu xanh nhạt (Create account)
    secondary: "bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold",
    // Button style for the Sign up card
    signup: "bg-[#E9EDFF] hover:bg-[#DDE6FF] text-[#2563EB] font-semibold rounded-lg py-4",
  };

  const className = `${baseStyle} ${variants[variant] || ""}${disabled ? " opacity-60 pointer-events-none" : ""}${classNameProp ? ` ${classNameProp}` : ""}`;

  if (to) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;