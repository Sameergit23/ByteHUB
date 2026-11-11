import React, { forwardRef } from "react";
import { Spinner } from "./Loader";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "text";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      isLoading = false,
      className = "",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    // 44px minimum touch target for WCAG 2.2 AA
    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs min-h-[44px]",
      md: "px-5 py-2.5 text-sm min-h-[44px]",
      lg: "px-7 py-3.5 text-base min-h-[48px]",
    }[size];

    const variantStyles = {
      // Primary: solid accent red (#B8341A) matching design reference images
      primary:
        "bg-accent text-white border border-accent hover:bg-accent-hover hover:border-accent-hover active:bg-[#862410]",
      // Outline: transparent background, 1px crisp border
      outline:
        "bg-white text-ink border border-editorial-border hover:border-ink hover:bg-canvas active:bg-editorial-border",
      // Text: no border, simple ink text with hover underline
      text: "bg-transparent text-ink hover:underline hover:text-accent p-2",
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-sans font-semibold tracking-tight transition-colors select-none focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 disabled:opacity-40 disabled:pointer-events-none ${sizeStyles} ${variantStyles} ${
          fullWidth ? "w-full" : ""
        } ${className}`}
        {...props}
      >
        {isLoading && <Spinner className="mr-2 h-4 w-4" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
