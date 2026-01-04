"use client";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    const base = "font-medium rounded-lg transition-colors disabled:opacity-50";
    const variants = {
      primary: "bg-primary text-white hover:bg-primary-dark",
      secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
      ghost: "bg-transparent hover:bg-gray-100",
    };
    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2",
      lg: "px-6 py-3 text-lg",
    };
    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? "..." : children}
      </button>
    );
  }
);
Button.displayName = "Button";
