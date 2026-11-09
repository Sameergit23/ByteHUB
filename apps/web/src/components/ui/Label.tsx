import React from "react";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  error?: string;
  helperText?: string;
}

export const Label: React.FC<LabelProps> = ({
  children,
  required,
  error,
  helperText,
  className = "",
  ...props
}) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label
          className={`block text-xs font-sans font-medium text-ink tracking-normal ${className}`}
          {...props}
        >
          {children}
          {required && <span className="text-accent ml-1" aria-hidden="true">*</span>}
        </label>
      </div>
      {helperText && !error && (
        <p className="text-[11px] text-editorial-muted">{helperText}</p>
      )}
      {error && (
        <p className="text-[11px] text-accent font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
