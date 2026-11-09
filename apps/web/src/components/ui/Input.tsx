import React, { forwardRef } from "react";
import { Label } from "./Label";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, required, id, className = "", ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <Label htmlFor={inputId} required={required} error={error} helperText={helperText}>
            {label}
          </Label>
        )}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white text-ink border transition-colors placeholder:text-editorial-muted/70 focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 disabled:bg-canvas disabled:text-editorial-muted disabled:cursor-not-allowed ${
            error
              ? "border-accent focus-visible:outline-accent"
              : "border-editorial-border hover:border-ink focus-visible:border-ink"
          } ${className}`}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";

