import React, { forwardRef } from "react";
import { Label } from "./Label";

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, required, id, className = "", ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <Label htmlFor={selectId} required={required} error={error} helperText={helperText}>
            {label}
          </Label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            aria-invalid={Boolean(error)}
            className={`w-full min-h-[44px] px-3.5 py-2.5 pr-10 text-sm bg-white text-ink border appearance-none transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 disabled:bg-canvas disabled:text-editorial-muted disabled:cursor-not-allowed ${
              error
                ? "border-accent focus-visible:outline-accent"
                : "border-editorial-border hover:border-ink focus-visible:border-ink"
            } ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={String(opt.value)} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* Custom SVG dropdown chevron */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-ink"
            aria-hidden="true"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";
