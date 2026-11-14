"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ByteHubLogo } from "../brand/ByteHubLogo";
import { hasStaffPermission, type StaffPermission } from "@bytehub/shared";
import {
  apiFetch,
  ApiError,
  getStoredUser,
  logout,
  redirectToLogin,
  refreshSession,
  type StoredUser,
} from "../../lib/api";
import { TwoFactorSetup } from "./TwoFactorSetup";
import {
  IconApplicant,
  IconAudit,
  IconBriefcase,
  IconCard,
  IconCheck,
  IconAlert,
  IconClipboard,
  IconClose,
  IconExternal,
  IconGraduation,
  IconInbox,
  IconMenu,
  IconOverview,
  IconServer,
  IconShield,
  IconSignOut,
  IconUsers,
  type IconComponent,
} from "./icons";
import { cx } from "./ui";
import { adminErrorMessage } from "./useAdminResource";
import type { AdminMetrics, Envelope, JobStats } from "./types";

/* ------------------------------------------------------------------------------------------ */
/* Shared state: sidebar counters and notifications                                            */
/* ------------------------------------------------------------------------------------------ */

export interface AdminSummary {
  metrics: AdminMetrics | null;
  failedJobs: number | null;
  loading: boolean;
  error: string | null;
}

interface Toast {
  id: number;
  tone: "success" | "error";
  message: string;
}

/** The signed-in staff member's role and permissions (from /auth/me). */
export interface StaffInfo {
  roleId: string | null;
  roleName: string | null;
  permissions: string[];
  twoFactorEnabled: boolean;
  backupCodesLeft: number;
  sessionVerified: boolean;
}

interface AdminContextValue {
  summary: AdminSummary;
  refreshSummary: () => void;
  notify: (tone: Toast["tone"], message: string) => void;
  /** Public address of an admin page, e.g. href("/users") → "/<secret>/users". */
  href: (path?: string) => string;
  staff: StaffInfo | null;
  can: (permission: StaffPermission) => boolean;
  /** The signed-in staff member's own user id (to hide actions on yourself). */
  userId: string | null;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin must be used inside <AdminShell>");
  return value;
}

/* ------------------------------------------------------------------------------------------ */
/* Navigation                                                                                  */
/* ------------------------------------------------------------------------------------------ */

type BadgeKey = "newApplications" | "unreadMessages" | "failedJobs";

interface NavItem {
  /** Path inside the admin panel ("" is the overview). */
  path: string;
  label: string;
  icon: IconComponent;
  badge?: BadgeKey;
  /** Shown only to staff whose role has this permission (the API checks it too). */
  permission: StaffPermission;
}

const NAV_GROUPS: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { path: "", label: "Overview", icon: IconOverview, permission: "dashboard.view" },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        path: "/internships",
        label: "Internships",
        icon: IconBriefcase,
        permission: "internships.manage",
      },
      {
        path: "/applications",
        label: "Applications",
        icon: IconApplicant,
        badge: "newApplications",
        permission: "applications.view",
      },
    ],
  },
  {
    label: "Training",
    items: [
      {
        path: "/cohorts",
        label: "Programmes & cohorts",
        icon: IconGraduation,
        permission: "training.manage",
      },
      {
        path: "/enrolments",
        label: "Enrolments",
        icon: IconClipboard,
        permission: "enrolments.manage",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        path: "/payments",
        label: "Payments & refunds",
        icon: IconCard,
        permission: "payments.view",
      },
    ],
  },
  {
    label: "People",
    items: [
      { path: "/users", label: "Users", icon: IconUsers, permission: "users.view" },
      {
        path: "/roles",
        label: "Roles & permissions",
        icon: IconShield,
        permission: "staff.manage",
      },
    ],
  },
  {
    label: "Support",
    items: [
      {
        path: "/messages",
        label: "Inbox",
        icon: IconInbox,
        badge: "unreadMessages",
        permission: "messages.manage",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        path: "/audit",
        label: "Activity log",
        icon: IconAudit,
        permission: "audit.view",
      },
      {
        path: "/system",
        label: "System health",
        icon: IconServer,
        badge: "failedJobs",
        permission: "system.view",
      },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

/** The page's path inside the panel, whatever the panel's address is ("/<secret>/users" → "/users"). */
function panelPath(pathname: string): string {
  return pathname.replace(/^\/[^/]+/, "").replace(/\/$/, "");
}

function isActive(relativePath: string, itemPath: string): boolean {
  return itemPath === "" ? relativePath === "" : relativePath.startsWith(itemPath);
}

/** Staff are signed out after this long without touching the mouse, keyboard or screen. */
const IDLE_SIGN_OUT_MS = 60 * 60 * 1000;
const IDLE_WARNING_MS = 55 * 60 * 1000;

const BADGE_STYLES: Record<BadgeKey, string> = {
  newApplications: "bg-amber-400 text-amber-950",
  unreadMessages: "bg-blue-500 text-white",
  failedJobs: "bg-red-500 text-white",
};

/* ------------------------------------------------------------------------------------------ */
/* Shell                                                                                       */
/* ------------------------------------------------------------------------------------------ */

export function AdminShell({
  basePath = "/admin",
  children,
}: {
  /** The panel's public address (the secret ADMIN_PATH, or /admin in development). */
  basePath?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || basePath;
  const relativePath = panelPath(pathname);
  const href = useCallback(
    (path = "") =>
      `${basePath}${path.startsWith("/") || path === "" ? path : `/${path}`}`,
    [basePath]
  );
  const [user, setUser] = useState<StoredUser | null>(null);
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [gate, setGate] = useState<"loading" | "setup" | "reverify" | "ready" | "error">(
    "loading"
  );
  const [idleWarning, setIdleWarning] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [environment, setEnvironment] = useState<"live" | "local" | "other" | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [summary, setSummary] = useState<AdminSummary>({
    metrics: null,
    failedJobs: null,
    loading: true,
    error: null,
  });
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const toastId = useRef(0);

  useEffect(() => {
    setUser(getStoredUser());
    const host = window.location.hostname;
    setEnvironment(
      host === "bytehubnet.com" || host.endsWith(".bytehubnet.com")
        ? "live"
        : host === "localhost" || host === "127.0.0.1"
          ? "local"
          : "other"
    );
  }, []);

  // Who is signed in, their role, and whether two-factor sign-in is done.
  const loadStaff = useCallback(async () => {
    try {
      const res = await apiFetch<
        Envelope<{
          id: string;
          name: string;
          email: string;
          role: string;
          staff?: StaffInfo;
        }>
      >("/auth/me");
      const me = res.data;
      if (me.role !== "ADMIN" || !me.staff) {
        window.location.assign("/dashboard");
        return;
      }
      setUserId(me.id);
      setUser(
        (u) =>
          ({
            ...(u ?? {}),
            id: me.id,
            name: me.name,
            email: me.email,
            role: "ADMIN",
          }) as StoredUser
      );
      setStaff(me.staff);
      setGate(
        !me.staff.twoFactorEnabled
          ? "setup"
          : !me.staff.sessionVerified
            ? "reverify"
            : "ready"
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        redirectToLogin();
        return;
      }
      setGate("error");
    }
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const can = useCallback(
    (permission: StaffPermission) => hasStaffPermission(staff?.permissions, permission),
    [staff]
  );

  const refreshSummary = useCallback(async () => {
    if (gate !== "ready") return;
    setSummary((s) => ({ ...s, loading: true }));
    const skipped = Promise.reject(new Error("not permitted"));
    skipped.catch(() => null);
    const [metrics, jobs] = await Promise.allSettled([
      can("dashboard.view")
        ? apiFetch<Envelope<AdminMetrics>>("/admin/metrics")
        : skipped,
      can("system.view") ? apiFetch<Envelope<JobStats>>("/admin/jobs/stats") : skipped,
    ]);

    const unauthorised = [metrics, jobs].some(
      (r) =>
        r.status === "rejected" && r.reason instanceof ApiError && r.reason.status === 401
    );
    if (unauthorised) {
      redirectToLogin();
      return;
    }

    setSummary({
      metrics: metrics.status === "fulfilled" ? metrics.value.data : null,
      failedJobs: jobs.status === "fulfilled" ? jobs.value.data.failedDlqCount : null,
      loading: false,
      error:
        metrics.status === "rejected" && can("dashboard.view")
          ? adminErrorMessage(metrics.reason, "The overview numbers could not be loaded.")
          : null,
    });
  }, [gate, can]);

  // Keep the session alive only while the person is actually using the panel; sign out
  // after an hour without any activity (the API enforces the same limit).
  const lastActivity = useRef(Date.now());
  useEffect(() => {
    if (gate !== "ready") return;
    const touch = () => {
      lastActivity.current = Date.now();
      setIdleWarning(false);
    };
    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"] as const;
    let lastMove = 0;
    const onEvent = (e: Event) => {
      if (e.type === "mousemove") {
        const now = Date.now();
        if (now - lastMove < 15000) return;
        lastMove = now;
      }
      touch();
    };
    events.forEach((name) => window.addEventListener(name, onEvent, { passive: true }));

    const tick = async () => {
      const idleFor = Date.now() - lastActivity.current;
      if (idleFor >= IDLE_SIGN_OUT_MS) {
        await logout();
        window.location.assign("/auth?mode=login&reason=idle");
        return;
      }
      setIdleWarning(idleFor >= IDLE_WARNING_MS);
      const lastRefresh = Number(localStorage.getItem("bytehub_refreshed_at") || 0);
      if (idleFor < 10 * 60 * 1000 && Date.now() - lastRefresh > 10 * 60 * 1000) {
        void refreshSession();
      }
    };
    const timer = window.setInterval(() => void tick(), 30 * 1000);
    return () => {
      window.clearInterval(timer);
      events.forEach((name) => window.removeEventListener(name, onEvent));
    };
  }, [gate]);

  // Counters refresh on every page change, so the sidebar badges stay current.
  useEffect(() => {
    void refreshSummary();
  }, [pathname, refreshSummary]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const notify = useCallback((tone: Toast["tone"], message: string) => {
    const id = ++toastId.current;
    setToasts((list) => [...list, { id, tone, message }]);
    window.setTimeout(
      () => setToasts((list) => list.filter((t) => t.id !== id)),
      tone === "error" ? 9000 : 5000
    );
  }, []);

  const handleSignOut = async () => {
    await logout();
    window.location.assign("/auth?mode=login");
  };

  const badgeCount = (key: BadgeKey | undefined): number | null => {
    if (key === "newApplications") return summary.metrics?.newApplications ?? null;
    if (key === "unreadMessages") return summary.metrics?.unhandledMessages ?? null;
    if (key === "failedJobs") return summary.failedJobs;
    return null;
  };

  const current = ALL_ITEMS.find((item) => isActive(relativePath, item.path));
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(item.permission)),
  })).filter((group) => group.items.length > 0);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5">
        <Link
          href={href()}
          aria-label="Admin overview"
          className="flex items-center gap-2.5"
        >
          <ByteHubLogo variant="dark" size="sm" height={24} />
        </Link>
        <span className="border border-white/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Admin
        </span>
      </div>

      <nav
        aria-label="Admin sections"
        className="admin-scroll flex-1 space-y-5 overflow-y-auto px-3 py-4"
      >
        {visibleGroups.map((group, index) => (
          <div key={group.label ?? index}>
            {group.label && (
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(relativePath, item.path);
                const count = badgeCount(item.badge);
                const Icon = item.icon;
                return (
                  <li key={item.path || "overview"}>
                    <Link
                      href={href(item.path)}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "group relative flex items-center gap-3 px-3 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-white/10 font-medium text-white"
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                      )}
                    >
                      {active && (
                        <span
                          className="absolute inset-y-1 left-0 w-0.5 bg-blue-500"
                          aria-hidden="true"
                        />
                      )}
                      <Icon
                        className={cx(
                          "h-4 w-4 shrink-0",
                          active
                            ? "text-white"
                            : "text-zinc-500 group-hover:text-zinc-300"
                        )}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && count !== null && count > 0 && (
                        <span
                          className={cx(
                            "min-w-[1.25rem] px-1.5 text-center text-[11px] font-semibold tabular-nums",
                            BADGE_STYLES[item.badge]
                          )}
                        >
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
        >
          <IconExternal className="h-4 w-4 text-zinc-500" />
          View live site
        </a>
        <div className="mt-2 flex items-center gap-3 px-3 py-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center bg-blue-600 text-xs font-semibold uppercase text-white"
            aria-hidden="true"
          >
            {(user?.name || "A").trim().charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-100">
              {user?.name || "Administrator"}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {staff?.roleName || "Staff"}
              {user?.email ? ` · ${user.email}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="p-1.5 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
            title="Sign out"
          >
            <IconSignOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  if (gate === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 font-sans text-sm text-zinc-500">
        Checking your access…
      </div>
    );
  }
  if (gate === "setup") {
    return (
      <TwoFactorSetup
        name={user?.name || "Staff"}
        onDone={() => window.location.reload()}
      />
    );
  }
  if (gate === "reverify" || gate === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 font-sans">
        <div className="max-w-md space-y-4 border border-zinc-200 bg-white p-6 text-sm text-zinc-700 shadow-sm">
          <h1 className="text-lg font-semibold text-zinc-900">
            {gate === "reverify"
              ? "Please sign in again"
              : "The admin panel couldn't load"}
          </h1>
          <p>
            {gate === "reverify"
              ? "Two-factor sign-in is on for your account, so this session needs the code from your authenticator app."
              : "Check your connection and try again in a moment."}
          </p>
          <button
            type="button"
            onClick={async () => {
              if (gate === "reverify") {
                await logout();
                window.location.assign("/auth?mode=login");
              } else {
                window.location.reload();
              }
            }}
            className="bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            {gate === "reverify" ? "Sign in" : "Try again"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminContext.Provider
      value={{
        summary,
        refreshSummary: () => void refreshSummary(),
        notify,
        href,
        staff,
        can,
        userId,
      }}
    >
      <div className="min-h-screen bg-zinc-100 font-sans text-zinc-900 antialiased lg:flex">
        {/* Desktop sidebar */}
        <aside className="admin-sidebar sticky top-0 hidden h-screen w-64 shrink-0 bg-zinc-950 lg:block">
          {sidebar}
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <MobileDrawer
            onClose={() => {
              setDrawerOpen(false);
              menuButtonRef.current?.focus();
            }}
          >
            {sidebar}
          </MobileDrawer>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/95 px-4 backdrop-blur lg:px-8">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="-ml-1 p-1.5 text-zinc-600 hover:bg-zinc-100 lg:hidden"
              aria-label="Open admin menu"
              aria-expanded={drawerOpen}
            >
              <IconMenu className="h-5 w-5" />
            </button>
            <nav aria-label="Breadcrumb" className="min-w-0 text-sm">
              <ol className="flex items-center gap-2 text-zinc-500">
                <li className="hidden sm:block">
                  <Link href={href()} className="hover:text-zinc-900">
                    Admin
                  </Link>
                </li>
                {current && current.path !== "" && (
                  <>
                    <li className="hidden sm:block" aria-hidden="true">
                      /
                    </li>
                    <li
                      className="truncate font-medium text-zinc-900"
                      aria-current="page"
                    >
                      {current.label}
                    </li>
                  </>
                )}
                {(!current || current.path === "") && (
                  <li className="truncate font-medium text-zinc-900 sm:hidden">
                    Overview
                  </li>
                )}
              </ol>
            </nav>
            <div className="ml-auto flex items-center gap-3">
              {environment === "live" && (
                <span
                  className="inline-flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800"
                  title="Changes here affect the real website and real users."
                >
                  <span className="h-1.5 w-1.5 bg-emerald-500" aria-hidden="true" />
                  Live data
                </span>
              )}
              {environment === "local" && (
                <span className="inline-flex items-center gap-1.5 border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700">
                  <span className="h-1.5 w-1.5 bg-zinc-400" aria-hidden="true" />
                  Local
                </span>
              )}
            </div>
          </header>

          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 px-4 py-6 focus:outline-none lg:px-8 lg:py-8"
          >
            {idleWarning && (
              <div
                role="status"
                className="mx-auto mb-4 w-full max-w-7xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              >
                You&apos;ll be signed out in about 5 minutes because there&apos;s been no
                activity. Move the mouse or press a key to stay signed in.
              </div>
            )}
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>

        {/* Notifications */}
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-20 right-4 z-[70] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
              className={cx(
                "pointer-events-auto flex items-start gap-3 border bg-white px-4 py-3 text-sm shadow-lg",
                toast.tone === "error" ? "border-red-200" : "border-zinc-200"
              )}
            >
              {toast.tone === "error" ? (
                <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              ) : (
                <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              )}
              <p className="flex-1 text-zinc-800">{toast.message}</p>
              <button
                type="button"
                onClick={() => setToasts((list) => list.filter((t) => t.id !== toast.id))}
                className="-mr-1 p-0.5 text-zinc-400 hover:text-zinc-700"
                aria-label="Dismiss notification"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </AdminContext.Provider>
  );
}

function MobileDrawer({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a[href], button")?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Admin menu"
    >
      <div
        className="absolute inset-0 bg-zinc-950/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className="admin-sidebar relative h-full w-72 max-w-[85vw] bg-zinc-950 shadow-2xl"
        onClick={(e) => {
          // Close after picking a link, including the page that is already open.
          if ((e.target as HTMLElement).closest("a")) onClose();
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-11 top-3 bg-zinc-950 p-2 text-zinc-300 hover:text-white"
          aria-label="Close admin menu"
        >
          <IconClose className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}
