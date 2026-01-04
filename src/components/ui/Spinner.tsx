"use client";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent ${className}`} />
  );
}
