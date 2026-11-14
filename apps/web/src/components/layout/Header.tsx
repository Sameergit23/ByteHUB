"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ByteHubLogo } from "../brand/ByteHubLogo";
import { getStoredUser, logout, StoredUser } from "../../lib/api";

function dashboardFor(role: StoredUser["role"]): string {
  if (role === "ADMIN") return "/admin";
  if (role === "COMPANY") return "/dashboard/company";
  return "/dashboard/student";
}

export const Header: React.FC = () => {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [user, setUser] = useState<StoredUser | null>(null);

  // Signed-in state is read after mount (it lives in the browser), on every navigation, and
  // when another tab signs in or out.
  useEffect(() => {
    setUser(getStoredUser());
  }, [pathname]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === "bytehub_user") setUser(getStoredUser());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleSignOut = async () => {
    setDrawerOpen(false);
    await logout();
    setUser(null);
    window.location.href = "/";
  };

  const firstName = user?.name?.split(" ")[0] || "";

  const navLinks = [
    { label: "Internships", href: "/internships" },
    { label: "Training", href: "/training" },
    { label: "For companies", href: "/companies" },
    { label: "About", href: "/about" },
  ];

  // Mobile drawer accessibility: focus trap, Escape key, and body scroll lock
  useEffect(() => {
    if (!drawerOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable && focusable.length > 0) {
      focusable[0]?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
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
    };
  }, [drawerOpen]);

  return (
    <header className="w-full bg-canvas border-b border-editorial-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
        {/* Left: Brand Logo matching design reference */}
        <div className="flex items-center">
          <Link
            href="/"
            className="hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 min-h-[44px] inline-flex items-center transition-opacity"
            aria-label="ByteHUB Home"
          >
            <ByteHubLogo variant="light" size="sm" />
          </Link>
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-8 lg:gap-10"
          aria-label="Main Navigation"
        >
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-sans font-medium transition-colors py-2 border-b-2 min-h-[44px] inline-flex items-center focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 ${
                  isActive
                    ? "text-ink border-accent font-bold"
                    : "text-editorial-muted border-transparent hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="hidden md:flex items-center gap-6">
          {user ? (
            <>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-sm font-sans font-semibold text-editorial-muted hover:text-ink hover:underline min-h-[44px] min-w-[44px] inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
              >
                Sign out
              </button>
              <Link
                href={dashboardFor(user.role)}
                aria-label={`Open your dashboard (signed in as ${user.name})`}
                className="bg-ink text-canvas px-5 py-2.5 text-sm font-sans font-semibold hover:bg-accent border border-ink hover:border-accent min-h-[44px] inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 transition-colors"
              >
                {firstName ? `${firstName} · Dashboard` : "Dashboard"}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/auth?mode=login"
                className="text-sm font-sans font-semibold text-ink hover:text-accent hover:underline min-h-[44px] min-w-[44px] inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
              >
                Log in
              </Link>
              <Link
                href="/internships"
                className="bg-accent text-white px-5 py-2.5 text-sm font-sans font-semibold hover:bg-accent-hover active:bg-[#862410] border border-accent min-h-[44px] inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 transition-colors"
              >
                Apply now
              </Link>
            </>
          )}
        </div>

        {/* Mobile: Hamburger Button */}
        <div className="md:hidden flex items-center">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open Navigation Menu"
            aria-expanded={drawerOpen}
            className="min-h-[44px] min-w-[44px] p-2 inline-flex items-center justify-center border border-editorial-border bg-white text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="square"
                strokeLinejoin="miter"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Accessible Full-Screen Drawer */}
      {drawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="fixed inset-0 z-50 md:hidden flex flex-col bg-canvas"
        >
          {/* Drawer Top Header */}
          <div className="h-18 px-4 border-b border-editorial-border flex items-center justify-between">
            <Link
              href="/"
              onClick={() => setDrawerOpen(false)}
              className="inline-flex items-center min-h-[44px]"
              aria-label="ByteHUB Home"
            >
              <ByteHubLogo variant="light" size="sm" />
            </Link>

            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close Navigation Menu"
              className="min-h-[44px] min-w-[44px] p-2 inline-flex items-center justify-center border border-editorial-border bg-white text-ink hover:text-accent focus-visible:outline-2 focus-visible:outline-ink"
            >
              <span className="font-mono text-lg font-bold">✕</span>
            </button>
          </div>

          {/* Drawer Links */}
          <div
            ref={drawerRef}
            className="flex-1 overflow-y-auto px-6 py-8 flex flex-col justify-between"
          >
            <nav className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setDrawerOpen(false)}
                  className="text-2xl font-heading font-bold text-ink hover:text-accent border-b border-editorial-line pb-3 min-h-[44px] flex items-center focus-visible:outline-2 focus-visible:outline-ink"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Bottom Actions */}
            <div className="pt-8 space-y-3">
              {user ? (
                <>
                  <Link
                    href={dashboardFor(user.role)}
                    onClick={() => setDrawerOpen(false)}
                    className="w-full bg-ink text-canvas py-3.5 text-center font-sans font-semibold text-base block hover:bg-accent min-h-[44px]"
                  >
                    {firstName ? `${firstName} · Dashboard` : "Dashboard"}
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full bg-white border border-editorial-border py-3.5 text-center font-sans font-semibold text-base text-ink block hover:border-ink min-h-[44px]"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/internships"
                    onClick={() => setDrawerOpen(false)}
                    className="w-full bg-accent text-white py-3.5 text-center font-sans font-semibold text-base block hover:bg-accent-hover min-h-[44px]"
                  >
                    Apply now
                  </Link>
                  <Link
                    href="/auth?mode=login"
                    onClick={() => setDrawerOpen(false)}
                    className="w-full bg-white border border-editorial-border py-3.5 text-center font-sans font-semibold text-base text-ink block hover:border-ink min-h-[44px]"
                  >
                    Log in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
