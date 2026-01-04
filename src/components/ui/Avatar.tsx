"use client";

type AvatarProps = {
  src?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function Avatar({ src, name = "?", size = "md", className = "" }: AvatarProps) {
  const sizes = { sm: "w-8 h-8 text-sm", md: "w-10 h-10", lg: "w-16 h-16 text-xl" };
  const initials = name.slice(0, 2).toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <div className={`${sizes[size]} rounded-full bg-primary text-white flex items-center justify-center font-medium ${className}`}>
      {initials}
    </div>
  );
}
