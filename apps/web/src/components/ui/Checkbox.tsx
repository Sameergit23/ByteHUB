import React, { forwardRef } from "react";

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label: React.ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, id, className = "", ...props }, ref) => {
    const inputId = id || `cb-${Math.random().toString(36).substring(2, 9)}`;

    return (
      <div className={`space-y-1 ${className}`}>
        <label
          htmlFor={inputId}
          className="inline-flex items-start gap-3 cursor-pointer select-none min-h-[44px] py-1.5"
        >
          <div className="relative flex items-center justify-center mt-0.5">
            <input
              id={inputId}
              ref={ref}
              type="checkbox"
              className="peer sr-only"
              {...props}
            />
            {/* Custom 18px square checkbox */}
            <div
              className={`w-4 h-4 border bg-white flex items-center justify-center transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-ink peer-focus-visible:outline-offset-2 ${
                error ? "border-accent" : "border-editorial-border peer-hover:border-ink"
              } peer-checked:bg-ink peer-checked:border-ink`}
              aria-hidden="true"
            >
              <svg
                className="w-3 h-3 text-white hidden peer-checked:block"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <span className="text-sm font-sans text-ink leading-tight">{label}</span>
        </label>
        {error && (
          <p className="text-[11px] text-accent font-medium pl-7" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
