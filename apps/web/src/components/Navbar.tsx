"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getStoredUser, logout, StoredUser } from "../lib/api";
import { ByteHubLogo } from "./brand/ByteHubLogo";

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    window.location.href = "/";
  };

  const navLinks = [
    { label: "INTERNSHIPS", href: "/internships" },
    { label: "TRAINING", href: "/training" },
    { label: "FOR COMPANIES", href: "/for-companies" },
    { label: "ABOUT", href: "/about" },
    { label: "CONTACT", href: "/contact" },
  ];

  return (
    <header className="border-b border-editorial-border bg-canvas sticky top-0 z-50">
      {/* Top micro ticker bar */}
      <div className="border-b border-editorial-border px-4 py-1 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-editorial-muted">
        <div className="flex items-center gap-4">
          <span>BYTEHUB // PROTOCOL 2026.4</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">ACID TRANSACTION VERIFIED</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-accent font-semibold">● COHORTS ENROLLING</span>
          <span>EST. IST 15:21</span>
        </div>
      </div>

      {/* Main navigation masthead */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="hover:opacity-90 transition-opacity inline-flex items-center min-h-[44px]"
            aria-label="ByteHUB Home"
          >
            <ByteHubLogo variant="light" size="sm" />
          </Link>

          <nav className="hidden md:flex items-center gap-6" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs font-mono font-medium tracking-wider transition-colors py-1 border-b-2 ${
                    active
                      ? "text-accent border-accent"
                      : "text-editorial-muted border-transparent hover:text-ink hover:border-editorial-border"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href={
                  user.role === "ADMIN"
                    ? "/dashboard"
                    : user.role === "COMPANY"
                      ? "/dashboard/company"
                      : "/dashboard/student"
                }
                className="border border-ink bg-transparent text-ink px-3 py-1.5 text-xs font-mono font-medium hover:bg-ink hover:text-canvas transition-colors"
              >
                [{user.role}: {user.name.split(" ")[0]}]
              </Link>
              <button
                onClick={handleLogout}
                className="border border-editorial-border text-editorial-muted px-2.5 py-1.5 text-xs font-mono hover:text-accent hover:border-accent transition-colors"
              >
                SIGN OUT
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/auth?mode=login"
                className="border border-editorial-border bg-transparent text-ink px-4 py-2 text-xs font-mono font-semibold tracking-wider hover:border-ink transition-colors"
              >
                LOG IN
              </Link>
              <Link
                href="/auth?mode=signup"
                className="border border-accent bg-accent text-white px-4 py-2 text-xs font-mono font-semibold tracking-wider hover:bg-accent-hover transition-colors"
              >
                APPLY / REGISTER
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            className="border border-ink p-2 text-ink text-xs font-mono"
          >
            {menuOpen ? "[ CLOSE ]" : "[ MENU ]"}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-editorial-border bg-canvas px-4 pt-3 pb-6 space-y-3">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-xs font-mono py-2 border-b border-editorial-line text-ink hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="pt-2 flex flex-col gap-2">
            {user ? (
              <>
                <Link
                  href={
                    user.role === "ADMIN"
                      ? "/dashboard"
                      : user.role === "COMPANY"
                        ? "/dashboard/company"
                        : "/dashboard/student"
                  }
                  onClick={() => setMenuOpen(false)}
                  className="border border-ink text-center py-2 text-xs font-mono bg-ink text-canvas"
                >
                  OPEN {user.role} DASHBOARD
                </Link>
                <button
                  onClick={handleLogout}
                  className="border border-editorial-border text-center py-2 text-xs font-mono text-accent"
                >
                  SIGN OUT
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth?mode=login"
                  onClick={() => setMenuOpen(false)}
                  className="border border-ink text-center py-2 text-xs font-mono text-ink"
                >
                  LOG IN
                </Link>
                <Link
                  href="/auth?mode=signup"
                  onClick={() => setMenuOpen(false)}
                  className="border border-accent bg-accent text-center py-2 text-xs font-mono text-white"
                >
                  REGISTER ACCOUNT
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
