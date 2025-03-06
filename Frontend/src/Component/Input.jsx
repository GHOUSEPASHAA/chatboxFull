import React from "react";

const Input = ({ type, name, placeholder, value, onChange }) => {
  return (
    <input
      type={type}
      name={name} // Ensure name is passed for proper state handling
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="border rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
    />
  );
};

export default Input;
