import React from "react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav
      aria-label="Pagination Navigation"
      className={`flex items-center justify-between border-t border-editorial-border pt-4 w-full ${className}`}
    >
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="min-h-[44px] px-4 py-2 border border-editorial-border bg-white text-xs font-mono font-semibold text-ink hover:border-ink disabled:opacity-40 disabled:pointer-events-none transition-colors"
      >
        ← PREVIOUS
      </button>

      <div className="flex items-center gap-1 font-mono text-xs">
        {pages.map((p) => {
          const isActive = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onPageChange(p)}
              className={`min-h-[44px] min-w-[44px] px-3 py-2 border font-bold transition-colors ${
                isActive
                  ? "border-ink bg-ink text-canvas"
                  : "border-transparent bg-transparent text-editorial-muted hover:border-editorial-border hover:text-ink"
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="min-h-[44px] px-4 py-2 border border-editorial-border bg-white text-xs font-mono font-semibold text-ink hover:border-ink disabled:opacity-40 disabled:pointer-events-none transition-colors"
      >
        NEXT →
      </button>
    </nav>
  );
};

