import React from "react";

/** Small circular spinner for buttons and inline waits (SVG, so the site's square-corner rule can't flatten it). */
export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`animate-spin ${className}`}
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Thin indeterminate bar, shown at the top of an area that is loading. */
export function LoadingBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative h-0.5 w-full overflow-hidden bg-editorial-line ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-y-0 left-0 w-2/5 animate-loader-bar bg-accent" />
    </div>
  );
}

/**
 * Branded loader: the ByteHUB hub with its nodes lighting up in turn. Used for page-level
 * waits, including the first request after the free server has been asleep.
 */
export function BrandLoader({ size = 56 }: { size?: number }) {
  const nodes: [number, number][] = [
    [70, 28],
    [108, 34],
    [114, 70],
    [98, 102],
    [70, 114],
    [40, 104],
    [26, 70],
    [38, 38],
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" fill="none" aria-hidden="true">
      {nodes.map(([x, y], i) => (
        <line
          key={`l${i}`}
          x1="70"
          y1="70"
          x2={x}
          y2={y}
          stroke="#2563EB"
          strokeOpacity="0.35"
          strokeWidth="2.5"
        />
      ))}
      {nodes.map(([x, y], i) => (
        <circle
          key={`n${i}`}
          cx={x}
          cy={y}
          r="7"
          fill={i === 1 ? "#F59E0B" : "#0A1128"}
          className="animate-node-blink"
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
      <circle
        cx="70"
        cy="70"
        r="18"
        fill="#2563EB"
        className="animate-hub-pulse"
        style={{ transformOrigin: "70px 70px" }}
      />
    </svg>
  );
}

/** Centered page-level loading state with a status message for screen readers. */
export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex animate-fade-in flex-col items-center justify-center gap-4 py-24"
    >
      <BrandLoader />
      <p className="font-mono text-xs uppercase tracking-wider text-editorial-muted">
        {label}
      </p>
      <div className="w-40">
        <LoadingBar />
      </div>
    </div>
  );
}
