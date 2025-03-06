// src/components/ui/Card.jsx
import React from "react";

export const Card = ({ children, className }) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-md sm:shadow-lg p-3 sm:p-4 md:p-6 ${className}`}
    >
      {children}
    </div>
  );
};

export const CardContent = ({ children, className }) => {
  return (
    <div className={`p-1 sm:p-2 md:p-3 ${className}`}>
      {children}
    </div>
  );
};