import React from "react";

export interface ChipProps {
  label: string;
  variant?: "default" | "accent" | "outline";
  onRemove?: () => void;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  variant = "default",
  onRemove,
  className = "",
}) => {
  const variantStyles = {
    // Default matches Image 2 tags (e.g. Web Development)
    default: "bg-white text-ink border border-editorial-border",
    accent: "bg-accent text-white border border-accent",
    outline: "bg-transparent text-editorial-muted border border-editorial-border",
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-sans font-medium tracking-tight select-none ${variantStyles} ${className}`}
    >
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="hover:opacity-75 focus-visible:outline-1 focus-visible:outline-ink"
        >
          ✕
        </button>
      )}
    </span>
  );
};

