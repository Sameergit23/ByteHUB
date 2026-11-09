"use client";

import React, { useEffect } from "react";

export interface ToastProps {
  id?: string;
  type?: "info" | "success" | "error";
  title?: string;
  message: string;
  duration?: number;
  onDismiss?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  type = "info",
  title,
  message,
  duration = 4000,
  onDismiss,
  className = "",
}) => {
  useEffect(() => {
    if (!duration || !onDismiss) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const typeStyles = {
    info: "bg-white text-ink border-editorial-border",
    success: "bg-white text-ink border-l-4 border-l-green-700 border-editorial-border",
    error: "bg-white text-ink border-l-4 border-l-accent border-editorial-border",
  }[type];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative flex items-start justify-between gap-4 p-4 border shadow-md max-w-sm w-full ${typeStyles} ${className}`}
    >
      <div className="space-y-0.5">
        {title && <h4 className="font-heading text-sm font-bold text-ink">{title}</h4>}
        <p className="text-xs text-editorial-muted leading-relaxed">{message}</p>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="p-1 -mr-1 text-editorial-muted hover:text-ink min-h-[44px] min-w-[44px] inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-ink"
        >
          ✕
        </button>
      )}
    </div>
  );
};

