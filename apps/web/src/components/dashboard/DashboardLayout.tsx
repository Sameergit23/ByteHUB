"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getStoredUser, clearAuth } from "../../lib/api";

export interface NavItem {
  id: string;
  label: string;
  icon?: string;
  badge?: string | number;
}

interface DashboardLayoutProps {
  role: "STUDENT" | "COMPANY" | "ADMIN";
  title: string;
  subtitle?: string;
  navItems: NavItem[];
  activeNavId: string;
  onNavSelect: (id: string) => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardLayout({
  role,
  title,
  subtitle,
  navItems,
  activeNavId,
  onNavSelect,
  actions,
  children,
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const user = getStoredUser();

  const handleLogout = () => {
    clearAuth();
    router.push("/auth?mode=login");
  };

  const roleLabel =
    role === "STUDENT"
      ? "Student Portal"
      : role === "COMPANY"
      ? "Employer Portal"
      : "Administration";

  return (
    <div className="min-h-screen bg-[#F5F2EA] text-[#16150F] flex flex-col md:flex-row antialiased font-sans">
      {/* =================================================================== */}
      {/* Mobile Top Header (< 768px)                                         */}
      {/* =================================================================== */}
      <div className="md:hidden border-b border-[#D8D3C4] px-4 py-3 flex items-center justify-between bg-[#F5F2EA] sticky top-0 z-40">
        <Link href="/" className="font-heading font-bold text-lg tracking-tight">
          [ByteHUB]
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono px-2 py-0.5 border border-[#D8D3C4] uppercase">
            {role}
          </span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 border border-[#D8D3C4] text-xs font-mono"
            aria-label="Toggle navigation drawer"
          >
            {mobileMenuOpen ? "CLOSE" : "MENU"}
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* Mobile Drawer (Collapses at 360px)                                  */}
      {/* =================================================================== */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-[#F5F2EA] p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex justify-between items-center pb-4 border-b border-[#D8D3C4] mb-6">
              <span className="font-heading font-bold text-lg">[ByteHUB]</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-1 border border-[#16150F] text-xs font-mono"
              >
                ✕ CLOSE
              </button>
            </div>

            <div className="mb-6 pb-4 border-b border-[#D8D3C4]">
              <div className="text-xs font-mono uppercase text-[#5A574D]">{roleLabel}</div>
              <div className="font-bold text-base mt-1">{user?.name || "User"}</div>
              <div className="text-xs text-[#5A574D]">{user?.email}</div>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = activeNavId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onNavSelect(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between transition-colors ${
                      isActive
                        ? "bg-[#16150F] text-[#F5F2EA] font-medium"
                        : "text-[#5A574D] hover:text-[#16150F] hover:bg-[#EAE6D9]"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span
                        className={`text-xs px-1.5 py-0.2 border ${
                          isActive
                            ? "border-[#F5F2EA] text-[#F5F2EA]"
                            : "border-[#D8D3C4] text-[#5A574D]"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="pt-6 border-t border-[#D8D3C4]">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 border border-[#B8341A] text-[#B8341A] text-xs font-medium uppercase tracking-wider hover:bg-[#B8341A] hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* Desktop Fixed Sidebar (w-64)                                        */}
      {/* =================================================================== */}
      <aside className="hidden md:flex flex-col justify-between w-64 border-r border-[#D8D3C4] p-6 shrink-0 min-h-screen sticky top-0 h-screen overflow-y-auto">
        <div className="space-y-6">
          {/* Logo & Role Pill */}
          <div>
            <Link href="/" className="font-heading font-bold text-xl tracking-tight block">
              [ByteHUB]
            </Link>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 border border-[#D8D3C4] text-[10px] font-mono uppercase tracking-wider text-[#5A574D]">
              <span className="w-1.5 h-1.5 bg-[#B8341A]" />
              {roleLabel}
            </div>
          </div>

          {/* User Profile Summary */}
          <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-3 text-xs space-y-1">
            <div className="font-bold text-[#16150F] truncate">{user?.name || "Active Session"}</div>
            <div className="text-[#5A574D] font-mono text-[11px] truncate">{user?.email || ""}</div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1" aria-label="Dashboard Navigation">
            {navItems.map((item) => {
              const isActive = activeNavId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavSelect(item.id)}
                  className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between transition-colors ${
                    isActive
                      ? "bg-[#16150F] text-[#F5F2EA]"
                      : "text-[#5A574D] hover:text-[#16150F] hover:bg-[#EAE6D9]"
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 border ml-2 ${
                        isActive
                          ? "border-[#F5F2EA] text-[#F5F2EA]"
                          : "border-[#D8D3C4] text-[#5A574D]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-6 border-t border-[#D8D3C4] space-y-3">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2 text-left px-3 border border-[#D8D3C4] text-[#B8341A] hover:bg-[#B8341A] hover:text-white transition-colors text-xs font-medium uppercase tracking-wider"
          >
            Sign out
          </button>
          <div className="text-[10px] font-mono text-[#5A574D]">
            ByteHUB Platform v2.0 · Bangalore, IN
          </div>
        </div>
      </aside>

      {/* =================================================================== */}
      {/* Main Content Area                                                   */}
      {/* =================================================================== */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden min-w-0">
        {/* Page Top Heading Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#D8D3C4] mb-8">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight">
              {title}
            </h1>
            {subtitle && <p className="text-sm text-[#5A574D] mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
        </div>

        {/* View Content */}
        {children}
      </main>
    </div>
  );
}
