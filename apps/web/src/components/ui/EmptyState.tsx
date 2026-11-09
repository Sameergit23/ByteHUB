import React from "react";
import { Button } from "./Button";

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) => {
  return (
    <div
      className={`border border-editorial-border bg-white p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto ${className}`}
    >
      <div className="font-mono text-xs text-editorial-muted tracking-widest uppercase">
        [ NULL RECORD ]
      </div>
      <h3 className="font-heading text-xl font-bold text-ink tracking-tight">{title}</h3>
      <p className="text-sm font-sans text-editorial-muted leading-relaxed max-w-sm mx-auto">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

