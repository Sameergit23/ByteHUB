import React from "react";
import { ScrollReveal } from "./ScrollReveal";

interface SiteChromeProps {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The public website's frame: header, main landmark and footer. Used by app/(site)/layout.tsx;
 * the admin panel has its own frame (components/admin/AdminShell).
 */
export function SiteChrome({ header, footer, children }: SiteChromeProps) {
  return (
    <>
      <ScrollReveal />
      {header}
      <main id="main-content" className="flex-1 focus:outline-none">
        {children}
      </main>
      {footer}
    </>
  );
}
