"use client";
import { InputHTMLAttributes, forwardRef, ReactNode } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  icon?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium mb-1">{label}</label>}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={`w-full ${icon ? "pl-10" : ""} px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white shadow-md ${
              error ? "border-red-500" : "border-gray-300"
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
