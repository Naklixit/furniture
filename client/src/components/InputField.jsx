
const InputField = ({ label, type, placeholder, id, value, onChange, ...rest }) => {
  return (
    <div className="mb-4">
      <label 
        htmlFor={id} 
        className="block text-sm font-bold text-gray-900 mb-2"
      >
        {label}
      </label>
      <input
        type={type}
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all text-gray-700 placeholder-gray-400"
        {...rest}
      />
    </div>
  );
};

export default InputField;