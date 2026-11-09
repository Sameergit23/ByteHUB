import React, { forwardRef } from "react";
import { Label } from "./Label";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, required, id, rows = 4, className = "", ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <Label htmlFor={textareaId} required={required} error={error} helperText={helperText}>
            {label}
          </Label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${textareaId}-error` : undefined}
          className={`w-full p-3.5 text-sm bg-white text-ink border transition-colors placeholder:text-editorial-muted/70 focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 disabled:bg-canvas disabled:text-editorial-muted disabled:cursor-not-allowed ${
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

Textarea.displayName = "Textarea";

