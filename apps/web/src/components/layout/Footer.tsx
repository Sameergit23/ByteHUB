import React from "react";
import Link from "next/link";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-canvas border-t border-editorial-border mt-20 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 4 Columns that stack on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-editorial-border">
          {/* Column 1: Brand & Manifesto */}
          <div className="space-y-4">
            <div className="font-heading font-bold text-xl text-ink">
              [YOUR BRAND]
            </div>
            <p className="text-xs font-sans text-editorial-muted leading-relaxed max-w-xs">
              Real projects. Real mentors. Your first step into tech. Guided training programmes connected directly to verified internship opportunities.
            </p>
          </div>

          {/* Column 2: Directory */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-editorial-muted">
              Directory
            </h4>
            <ul className="space-y-2 text-sm font-sans">
              <li>
                <Link
                  href="/internships"
                  className="text-ink hover:text-accent transition-colors min-h-[44px] inline-flex items-center"
                >
                  Internships
                </Link>
              </li>
              <li>
                <Link
                  href="/training"
                  className="text-ink hover:text-accent transition-colors min-h-[44px] inline-flex items-center"
                >
                  Training programmes
                </Link>
              </li>
              <li>
                <Link
                  href="/for-companies"
                  className="text-ink hover:text-accent transition-colors min-h-[44px] inline-flex items-center"
                >
                  For companies
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-ink hover:text-accent transition-colors min-h-[44px] inline-flex items-center"
                >
                  About us
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-editorial-muted">
              Platform
            </h4>
            <ul className="space-y-2 text-sm font-sans">
              <li>
                <Link
                  href="/auth?mode=login"
                  className="text-ink hover:text-accent transition-colors min-h-[44px] inline-flex items-center"
                >
                  Log in
                </Link>
              </li>
              <li>
                <Link
                  href="/auth?mode=signup"
                  className="text-ink hover:text-accent transition-colors min-h-[44px] inline-flex items-center"
                >
                  Apply now
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/student"
                  className="text-ink hover:text-accent transition-colors min-h-[44px] inline-flex items-center"
                >
                  Student dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/styleguide"
                  className="text-ink hover:text-accent transition-colors min-h-[44px] inline-flex items-center font-mono text-xs"
                >
                  Component Styleguide
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Standards & Integrity */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-editorial-muted">
              Standards
            </h4>
            <div className="space-y-2 text-xs font-sans text-editorial-muted leading-relaxed">
              <p>Razorpay India & Stripe Global PCI-DSS</p>
              <p>PostgreSQL ACID Transaction Isolation</p>
              <p>WCAG 2.2 AA Accessibility Audited</p>
              <p>Zero Artificial Intelligence Gimmicks</p>
            </div>
          </div>
        </div>

        {/* Colophon */}
        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono text-editorial-muted">
          <div>
            © {new Date().getFullYear()} BYTEHUB PLATFORM. ALL RIGHTS RESERVED.
          </div>
          <div className="flex items-center gap-6">
            <span>SWISS-EDITORIAL SYSTEM</span>
            <span className="text-accent font-semibold">STATUS: PRODUCTION-GRADE</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
