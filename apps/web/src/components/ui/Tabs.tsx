import React, { useRef } from "react";

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeId,
  onChange,
  className = "",
}) => {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keyboard navigation for accessible tablist
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === "ArrowRight") {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    const nextTab = tabs[nextIndex];
    if (nextTab) {
      onChange(nextTab.id);
      tabRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Content Filters"
      className={`flex items-center gap-6 border-b border-editorial-border w-full ${className}`}
    >
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[idx] = el;
            }}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`relative py-3 text-sm font-sans font-semibold tracking-tight transition-colors min-h-[44px] inline-flex items-center focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 ${
              isActive
                ? "text-ink border-b-2 border-accent font-bold"
                : "text-editorial-muted hover:text-ink border-b-2 border-transparent"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
