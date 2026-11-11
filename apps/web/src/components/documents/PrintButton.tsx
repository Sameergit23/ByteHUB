"use client";

import { useState } from "react";

/** "Download PDF" opens the browser's print dialog, where "Save as PDF" is the destination. */
export function PrintButton({ label = "Download PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 bg-ink px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-canvas transition-colors hover:bg-ink-light print:hidden"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        aria-hidden="true"
      >
        <path
          d="M12 4v11M7 10l5 5 5-5M4 20h16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </button>
  );
}

/** Copies the page address so the document can be shared (CV, LinkedIn, email). */
export function CopyLinkButton({ label = "Copy link" }: { label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2500);
        } catch {
          // Clipboard blocked: the address bar still has the link.
        }
      }}
      className="inline-flex items-center gap-2 border border-ink px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-canvas print:hidden"
      aria-live="polite"
    >
      {copied ? "Link copied ✓" : label}
    </button>
  );
}
