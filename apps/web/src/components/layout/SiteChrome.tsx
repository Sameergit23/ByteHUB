"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { ApiWarmup } from "./ApiWarmup";
import { ScrollReveal } from "./ScrollReveal";

/** Sections that bring their own full-screen layout instead of the public header and footer. */
const APP_SECTIONS = ["/admin"];

interface SiteChromeProps {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Wraps every page in the public site's header, main landmark and footer — except the admin
 * panel, which renders its own sidebar, top bar and <main> (see components/admin/AdminShell).
 */
export function SiteChrome({ header, footer, children }: SiteChromeProps) {
  const pathname = usePathname() || "";
  const isAppSection = APP_SECTIONS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isAppSection) {
    return (
      <>
        <ApiWarmup />
        {children}
      </>
    );
  }

  return (
    <>
      <ApiWarmup />
      <ScrollReveal />
      {header}
      <main id="main-content" className="flex-1 focus:outline-none">
        {children}
      </main>
      {footer}
    </>
  );
}
