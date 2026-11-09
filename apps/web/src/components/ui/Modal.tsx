"use client";

import React, { useEffect, useRef } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  }[maxWidth];

  useEffect(() => {
    if (!isOpen) return;

    // Save previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Scroll lock
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus first focusable element inside modal
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable && focusable.length > 0) {
      focusable[0]?.focus();
    }

    // Escape listener & Focus Trap
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && focusable && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/60 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Body */}
      <div
        ref={modalRef}
        className={`relative w-full ${maxWidthStyles} bg-white border border-editorial-border shadow-2xl p-6 sm:p-8 space-y-6 z-10`}
      >
        <div className="flex items-start justify-between border-b border-editorial-line pb-4">
          <div className="space-y-1 pr-4">
            <h2 id="modal-title" className="font-heading text-xl font-bold text-ink tracking-tight">
              {title}
            </h2>
            {description && (
              <p id="modal-description" className="text-xs text-editorial-muted">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 -mr-2 -mt-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-ink hover:text-accent focus-visible:outline-2 focus-visible:outline-ink transition-colors"
          >
            <span className="font-mono text-base font-bold">✕</span>
          </button>
        </div>

        <div className="text-sm font-sans text-ink">{children}</div>
      </div>
    </div>
  );
};
