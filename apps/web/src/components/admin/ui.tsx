"use client";

import React, { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { formatDate } from "../../lib/format";
import type { PageMeta } from "./types";
import {
  IconAlert,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconDownload,
  IconRefresh,
  IconSearch,
  type IconComponent,
} from "./icons";

/* Building blocks for the admin console. Neutral zinc surfaces, square corners (site-wide
   rule), blue for primary actions, and colour only where it carries meaning. */

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "violet";

/* ------------------------------------------------------------------------------------------ */
/* Text helpers                                                                                */
/* ------------------------------------------------------------------------------------------ */

/** "just now", "5 min ago", "3 h ago", "2 d ago", then the date. */
export function timeAgo(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "—";
  const seconds = Math.round((Date.now() - time) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return formatDate(value);
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "AUTH_PASSWORD_RESET_REQUESTED" → "Auth password reset requested". */
export function humanize(code: string): string {
  const text = code
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b(csv|api|ip|id|url|otp|gdpr|idor|2fa)\b/g, (word) => word.toUpperCase());
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Plain-English names for the events the API writes to the audit log. */
const EVENT_LABELS: Record<string, string> = {
  AUTH_LOGIN_SUCCESS: "Signed in",
  AUTH_REGISTER_SUCCESS: "New account created",
  AUTH_PASSWORD_RESET_REQUESTED: "Password reset requested",
  AUTH_PASSWORD_CHANGED: "Password changed",
  AUTH_LOGOUT_ALL_SESSIONS: "Signed out on all devices",
  AUTH_RATE_LIMITED: "Too many sign-in attempts",
  SECURITY_ACCOUNT_LOCKED: "Account locked after failed sign-ins",
  SECURITY_REFRESH_TOKEN_REUSE_DETECTED: "Reused session blocked",
  SECURITY_IDOR_BLOCKED: "Blocked access to someone else's data",
  SECURITY_RESUME_IDOR_BLOCKED: "Blocked access to someone else's resume",
  ADMIN_DATA_EXPORT_CSV: "Data exported (CSV)",
  PAYMENT_CAPTURED: "Payment received",
  PAYMENT_SUCCESS_WEBHOOK: "Payment confirmed by Cashfree",
  PAYMENT_FAILED: "Payment failed",
  PAYMENT_FAILURE: "Payment failed",
  PAYMENT_FAILED_WEBHOOK: "Payment failed (Cashfree)",
  PAYMENT_USER_DROPPED_WEBHOOK: "Customer left checkout",
  PAYMENT_REVIEW_REQUIRED: "Payment needs review",
  PAYMENT_CAPTURED_AFTER_CLOSE: "Payment arrived after the seat hold ended",
  PAYMENT_REFUND_FULL: "Full refund recorded",
  PAYMENT_REFUND_PARTIAL: "Partial refund recorded",
  PAYMENT_RATE_LIMITED: "Too many payment attempts",
  ENROLMENT_CONFIRMED: "Enrolment confirmed",
  AUTH_PASSWORD_OK_TWO_FACTOR_PENDING: "Password correct, waiting for authenticator code",
  AUTH_TWO_FACTOR_ENABLED: "Two-factor sign-in turned on",
  AUTH_TWO_FACTOR_FAILED: "Wrong authenticator code",
  USER_UPDATED_BY_ADMIN: "Account details changed by staff",
  USER_BLOCKED: "Account blocked",
  USER_UNBLOCKED: "Account unblocked",
  USER_DELETED_BY_ADMIN: "Account deleted by staff",
  USER_PASSWORD_RESET_SENT: "Password reset link sent by staff",
  STAFF_ADDED: "Staff member added",
  STAFF_REMOVED: "Staff access removed",
  STAFF_ROLE_CHANGED: "Staff role changed",
  STAFF_TWO_FACTOR_RESET: "Staff two-factor sign-in reset",
  ROLE_CREATED: "Role created",
  ROLE_UPDATED: "Role permissions changed",
  ROLE_DELETED: "Role deleted",
  APPLICATION_SUBMITTED: "Application submitted",
  APPLICATION_SAVED_AWAITING_FEE: "Application saved, fee not paid yet",
  APPLICATION_STATUS_CHANGED: "Application status changed",
  APPLICATION_WITHDRAWN: "Application withdrawn",
  CONTACT_RATE_LIMITED: "Too many contact-form messages",
  GDPR_RIGHT_TO_ERASURE_PROCESSED: "Account data erased on request",
};

export function eventLabel(action: string): string {
  return EVENT_LABELS[action] ?? humanize(action);
}

/** 42 → "42 s", 5000 → "1 h 23 min", 200000 → "2 d 7 h". */
export function formatUptime(totalSeconds: number | undefined): string {
  if (totalSeconds === undefined || !Number.isFinite(totalSeconds)) return "—";
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s < 60) return `${s} s`;
  const minutes = Math.floor(s / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${minutes % 60} min`;
  return `${Math.floor(hours / 24)} d ${hours % 24} h`;
}

/** Whole rupees for dashboard figures, e.g. 125000 → "₹1,25,000". */
export function formatRupees(amountMajor: number): string {
  return `₹${Math.round(amountMajor).toLocaleString("en-IN")}`;
}

/* ------------------------------------------------------------------------------------------ */
/* Buttons                                                                                     */
/* ------------------------------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "danger" | "danger-outline" | "ghost";
type ButtonSize = "sm" | "md";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
  "danger-outline": "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
};

export function buttonClass(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md"
) {
  return cx(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size]);
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type="button"
      {...props}
      className={cx(buttonClass(variant, size), className)}
    />
  );
}

export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  className,
  children,
  external,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const cls = cx(buttonClass(variant, size), className);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/** Downloads a CSV export from the API (the API writes an audit-log entry for each export). */
export function ExportButton({
  entity,
}: {
  entity: "users" | "payments" | "enrolments";
}) {
  return (
    <a href={`/api/admin/export/${entity}`} download className={buttonClass("secondary")}>
      <IconDownload className="h-4 w-4" />
      Export CSV
    </a>
  );
}

export function RefreshButton({
  onClick,
  busy,
}: {
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <Button onClick={onClick} disabled={busy} aria-label="Refresh this page">
      <IconRefresh className={cx("h-4 w-4", busy && "animate-spin")} />
      <span className="hidden sm:inline">Refresh</span>
    </Button>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Layout                                                                                      */
/* ------------------------------------------------------------------------------------------ */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        {description && (
          <p className="mt-1 max-w-3xl text-sm text-zinc-500">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cx("border border-zinc-200 bg-white", className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3">
          <div className="min-w-0 flex-1">
            {title && <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

const STAT_ACCENT: Record<Tone, string> = {
  neutral: "",
  blue: "border-t-2 border-t-blue-600",
  green: "border-t-2 border-t-emerald-500",
  amber: "border-t-2 border-t-amber-500",
  red: "border-t-2 border-t-red-600",
  violet: "border-t-2 border-t-violet-500",
};

const STAT_HINT: Record<Tone, string> = {
  neutral: "text-zinc-500",
  blue: "text-blue-700",
  green: "text-emerald-700",
  amber: "text-amber-700",
  red: "text-red-700",
  violet: "text-violet-700",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  href,
  loading,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  href?: string;
  loading?: boolean;
  icon?: IconComponent;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-zinc-500">{label}</span>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-zinc-400" />}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-zinc-900">
        {loading ? <Skeleton className="h-8 w-20" /> : value}
      </div>
      {hint && !loading && (
        <div className={cx("mt-1 text-xs", STAT_HINT[tone])}>{hint}</div>
      )}
    </>
  );
  const cls = cx("block border border-zinc-200 bg-white p-4", STAT_ACCENT[tone]);
  if (href) {
    return (
      <Link href={href} className={cx(cls, "transition-colors hover:bg-zinc-50")}>
        {content}
      </Link>
    );
  }
  return <div className={cls}>{content}</div>;
}

export function DescriptionList({
  items,
  columns = 2,
}: {
  items: { label: string; value: React.ReactNode }[];
  columns?: 1 | 2;
}) {
  return (
    <dl
      className={cx(
        "grid grid-cols-1 gap-x-6 gap-y-4",
        columns === 2 && "sm:grid-cols-2"
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-medium text-zinc-500">{item.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-zinc-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Status                                                                                      */
/* ------------------------------------------------------------------------------------------ */

const BADGE_TONES: Record<Tone, string> = {
  neutral: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        BADGE_TONES[tone]
      )}
    >
      {children}
    </span>
  );
}

const STATUS_LABELS: Record<string, { label: string; tone: Tone }> = {
  // Internships
  DRAFT: { label: "Draft", tone: "amber" },
  PUBLISHED: { label: "Live", tone: "green" },
  CLOSED: { label: "Closed", tone: "neutral" },
  // Payments
  CREATED: { label: "Created", tone: "blue" },
  PENDING: { label: "Pending", tone: "amber" },
  PAID: { label: "Paid", tone: "green" },
  FAILED: { label: "Failed", tone: "red" },
  REFUNDED: { label: "Refunded", tone: "violet" },
  PARTIALLY_REFUNDED: { label: "Partly refunded", tone: "violet" },
  // Enrolments
  ACTIVE: { label: "Active", tone: "green" },
  COMPLETED: { label: "Completed", tone: "blue" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  EXPIRED: { label: "Expired", tone: "neutral" },
  // Applications
  PENDING_PAYMENT: { label: "Awaiting payment", tone: "amber" },
  SUBMITTED: { label: "New", tone: "blue" },
  UNDER_REVIEW: { label: "In review", tone: "amber" },
  INTERVIEW: { label: "Interview", tone: "violet" },
  OFFERED: { label: "Offered", tone: "green" },
  REJECTED: { label: "Not selected", tone: "neutral" },
  WITHDRAWN: { label: "Withdrawn", tone: "neutral" },
  // Roles
  STUDENT: { label: "Student", tone: "blue" },
  COMPANY: { label: "Company", tone: "violet" },
  ADMIN: { label: "Admin", tone: "red" },
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status]?.label ?? status.replace(/_/g, " ").toLowerCase();
}

export function StatusBadge({ status }: { status: string }) {
  const entry = STATUS_LABELS[status];
  return (
    <Badge tone={entry?.tone ?? "neutral"}>{entry?.label ?? statusLabel(status)}</Badge>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span className={cx("block animate-pulse bg-zinc-200", className)} />;
}

export function Notice({
  tone = "blue",
  title,
  children,
}: {
  tone?: "blue" | "amber" | "red" | "green";
  title?: string;
  children: React.ReactNode;
}) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
  }[tone];
  return (
    <div className={cx("border px-4 py-3 text-sm", tones)}>
      {title && <p className="font-medium">{title}</p>}
      <div className={cx(title && "mt-1")}>{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: IconComponent;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center bg-zinc-100 text-zinc-400">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <p className="text-sm font-medium text-zinc-900">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 bg-red-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-2 text-sm text-red-800">
        <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          <IconRefresh className="h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Tables                                                                                      */
/* ------------------------------------------------------------------------------------------ */

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  className?: string;
  align?: "left" | "right";
  /** Hide this column on screens narrower than the breakpoint, to keep actions in view. */
  hideBelow?: "lg" | "xl";
}

const HIDE_BELOW = { lg: "hidden lg:table-cell", xl: "hidden xl:table-cell" } as const;
const CELL_PADDING = "px-3 xl:px-4";

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  empty,
  skeletonRows = 6,
}: {
  caption: string;
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty: React.ReactNode;
  skeletonRows?: number;
}) {
  const colSpan = columns.length;
  let body: React.ReactNode;

  if (rows === undefined) {
    body = error ? (
      <tr>
        <td colSpan={colSpan} className="p-0">
          <ErrorState message={error} onRetry={onRetry} />
        </td>
      </tr>
    ) : (
      Array.from({ length: skeletonRows }, (_, i) => (
        <tr key={i}>
          {columns.map((c) => (
            <td
              key={c.key}
              className={cx(
                CELL_PADDING,
                "py-3.5",
                c.hideBelow && HIDE_BELOW[c.hideBelow]
              )}
            >
              <Skeleton className="h-4 w-full max-w-[9rem]" />
            </td>
          ))}
        </tr>
      ))
    );
  } else if (rows.length === 0) {
    body = (
      <tr>
        <td colSpan={colSpan} className="p-0">
          {empty}
        </td>
      </tr>
    );
  } else {
    body = rows.map((row) => (
      <tr key={rowKey(row)} className="hover:bg-zinc-50">
        {columns.map((c) => (
          <td
            key={c.key}
            className={cx(
              CELL_PADDING,
              "py-3 align-middle",
              c.align === "right" && "text-right",
              c.hideBelow && HIDE_BELOW[c.hideBelow],
              c.className
            )}
          >
            {c.render(row)}
          </td>
        ))}
      </tr>
    ));
  }

  return (
    <div>
      {rows !== undefined && error && (
        <div className="border-b border-zinc-200">
          <ErrorState message={error} onRetry={onRetry} />
        </div>
      )}
      {/* `relative` keeps visually hidden labels (absolutely positioned) inside the scroll box,
          so a wide table never makes the whole page wider on phones. */}
      <div className="relative overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cx(
                    CELL_PADDING,
                    "whitespace-nowrap py-2.5 text-xs font-medium uppercase tracking-wide text-zinc-500",
                    c.align === "right" && "text-right",
                    c.hideBelow && HIDE_BELOW[c.hideBelow]
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            aria-busy={loading || undefined}
            className={cx(
              "divide-y divide-zinc-100 transition-opacity",
              loading && rows !== undefined && "opacity-60"
            )}
          >
            {body}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Pagination({
  meta,
  onPageChange,
  itemLabel = "results",
}: {
  meta: PageMeta | undefined;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}) {
  if (!meta || meta.total === 0) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.total, meta.page * meta.limit);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 text-sm text-zinc-500">
      <span className="tabular-nums">
        {from}–{to} of {meta.total} {itemLabel}
      </span>
      {meta.totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => onPageChange(meta.page - 1)}
            disabled={meta.page <= 1}
          >
            <IconChevronLeft className="h-3.5 w-3.5" />
            Previous
          </Button>
          <span className="tabular-nums text-xs">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button
            size="sm"
            onClick={() => onPageChange(meta.page + 1)}
            disabled={meta.page >= meta.totalPages}
          >
            Next
            <IconChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Filters and inputs                                                                          */
/* ------------------------------------------------------------------------------------------ */

export function FilterTabs<V extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: V; label: string; count?: number | null }[];
  value: V;
  onChange: (value: V) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-zinc-200 px-2"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cx(
              "inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-blue-600 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            )}
          >
            {option.label}
            {typeof option.count === "number" && (
              <span
                className={cx(
                  "px-1.5 text-xs tabular-nums",
                  active ? "bg-blue-50 text-blue-700" : "bg-zinc-100 text-zinc-600"
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const inputClass =
  "h-9 w-full border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-600";

export const textareaClass =
  "min-h-[6rem] w-full border border-zinc-300 bg-white px-3 py-2 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:border-blue-600";

/** Inline problem message inside forms and dialogs (shakes so a repeat error is noticed). */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      key={message}
      role="alert"
      className="animate-alert-shake border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
    >
      {message}
    </p>
  );
}

export function CheckboxField({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-blue-600"
      />
      <span>
        <span className="block text-sm font-medium text-zinc-800">{label}</span>
        {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
      </span>
    </label>
  );
}

/** Splits a textarea into trimmed, non-empty lines (one item per line). */
export function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <label className="relative block w-full sm:w-80">
      <span className="sr-only">{label}</span>
      <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cx(inputClass, "pl-9")}
      />
    </label>
  );
}

export function SelectField<V extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: V;
  onChange: (value: V) => void;
  options: { value: V; label: string }[];
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-600">
      <span className="whitespace-nowrap">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as V)}
        className="h-9 border border-zinc-300 bg-white px-2 text-sm text-zinc-900 focus:border-blue-600"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * A small set of mutually exclusive options shown as a segmented control.
 * Built from real radio buttons, so it works with the keyboard and screen readers.
 */
export function SegmentedChoice<V extends string>({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string;
  /** Accessible name of the group. */
  label: string;
  value: V;
  options: { value: V; label: string }[];
  onChange: (value: V) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex border border-zinc-300 bg-white"
    >
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <label
            key={o.value}
            className={cx(
              "relative inline-flex h-8 cursor-pointer items-center border-r border-zinc-300 px-3 text-xs font-medium transition-colors last:border-r-0 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600",
              checked ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={checked}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-800">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Overlays (dialog and side drawer)                                                           */
/* ------------------------------------------------------------------------------------------ */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Focus trap, Escape to close, scroll lock and focus restore for modal overlays. */
function useOverlay(
  ref: React.RefObject<HTMLDivElement | null>,
  open: boolean,
  onClose: () => void
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const preferred =
      ref.current?.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0];
    preferred?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, ref]);
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useOverlay(ref, open, onClose);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-950/50 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cx(
          "max-h-[90vh] w-full overflow-y-auto bg-white shadow-xl",
          wide ? "sm:max-w-lg" : "sm:max-w-md"
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-zinc-900">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-zinc-500">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 shrink-0 p-1 text-zinc-400 hover:text-zinc-700"
            aria-label="Close"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>
        {children && <div className="space-y-4 px-5 py-4">{children}</div>}
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-3 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  danger,
  busy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={busy}
            data-autofocus
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useOverlay(ref, open, onClose);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end bg-zinc-950/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-zinc-900">
              {title}
            </h2>
            {subtitle && <div className="mt-1 text-sm text-zinc-500">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 shrink-0 p-1 text-zinc-400 hover:text-zinc-700"
            aria-label="Close"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
