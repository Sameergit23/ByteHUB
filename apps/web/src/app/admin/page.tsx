"use client";

import Link from "next/link";
import { useAdmin } from "../../components/admin/AdminShell";
import {
  IconArrowRight,
  IconBriefcase,
  IconCard,
  IconClipboard,
  IconInbox,
  IconServer,
  IconUsers,
  IconAudit,
} from "../../components/admin/icons";
import type {
  AdminAuditLog,
  AdminInternship,
  AdminMessage,
  AdminPayment,
  Envelope,
  HealthReport,
  Paged,
} from "../../components/admin/types";
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  RefreshButton,
  Skeleton,
  StatCard,
  StatusBadge,
  cx,
  formatRupees,
  formatUptime,
  eventLabel,
  plural,
  timeAgo,
} from "../../components/admin/ui";
import { useAdminResource } from "../../components/admin/useAdminResource";
import { formatMoney } from "../../lib/format";

export default function AdminOverviewPage() {
  const { summary, refreshSummary } = useAdmin();
  const metrics = summary.metrics;

  const pending = useAdminResource<AdminInternship[], Envelope<Paged<AdminInternship>>>(
    "/admin/internships?status=DRAFT&limit=5",
    (res) => res.data.items
  );
  const messages = useAdminResource<AdminMessage[], Envelope<AdminMessage[]>>(
    "/admin/contact-messages",
    (res) => res.data.filter((m) => !m.isRead).slice(0, 5)
  );
  const payments = useAdminResource<AdminPayment[], Envelope<Paged<AdminPayment>>>(
    "/admin/payments?limit=6",
    (res) => res.data.items
  );
  const activity = useAdminResource<AdminAuditLog[], Envelope<Paged<AdminAuditLog>>>(
    "/admin/audit-logs?limit=8",
    (res) => res.data.items
  );
  const health = useAdminResource<HealthReport, HealthReport>("/health", (res) => res);

  const busy =
    summary.loading ||
    pending.loading ||
    messages.loading ||
    payments.loading ||
    activity.loading ||
    health.loading;

  const refreshAll = () => {
    refreshSummary();
    pending.reload();
    messages.reload();
    payments.reload();
    activity.reload();
    health.reload();
  };

  const pendingCount = summary.pendingApprovals;
  const unreadCount = metrics?.unhandledMessages ?? null;
  const failedJobs = summary.failedJobs;
  const loadingNumbers = summary.loading && !metrics;

  return (
    <>
      <PageHeader
        title="Overview"
        description="What needs your attention today, and how the platform is doing."
        actions={<RefreshButton onClick={refreshAll} busy={busy} />}
      />

      {summary.error && !metrics && (
        <div className="mb-6 border border-zinc-200 bg-white">
          <ErrorState message={summary.error} onRetry={refreshSummary} />
        </div>
      )}

      {/* Key numbers */}
      <section
        aria-label="Key numbers"
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      >
        <StatCard
          label="Awaiting approval"
          icon={IconBriefcase}
          value={pendingCount ?? "—"}
          loading={summary.loading && pendingCount === null}
          tone={pendingCount ? "amber" : "neutral"}
          hint={
            pendingCount
              ? "Review now →"
              : pendingCount === 0
                ? "All caught up"
                : undefined
          }
          href="/admin/internships"
        />
        <StatCard
          label="Unread messages"
          icon={IconInbox}
          value={unreadCount ?? "—"}
          loading={loadingNumbers}
          tone={unreadCount ? "blue" : "neutral"}
          hint={
            unreadCount
              ? "Open inbox →"
              : unreadCount === 0
                ? "Inbox is clear"
                : undefined
          }
          href="/admin/messages"
        />
        <StatCard
          label="Revenue"
          icon={IconCard}
          value={metrics ? formatRupees(metrics.totalRevenueINR) : "—"}
          loading={loadingNumbers}
          hint={
            metrics && metrics.totalRevenueUSD > 0
              ? `+ $${metrics.totalRevenueUSD.toLocaleString("en-US")} · paid orders`
              : "All paid orders"
          }
          href="/admin/payments"
        />
        <StatCard
          label="Active enrolments"
          icon={IconClipboard}
          value={metrics?.activeEnrollments ?? "—"}
          loading={loadingNumbers}
          hint="Students in a cohort"
          href="/admin/enrolments"
        />
        <StatCard
          label="Users"
          icon={IconUsers}
          value={metrics?.userCount ?? "—"}
          loading={loadingNumbers}
          hint="Students, companies and admins"
          href="/admin/users"
        />
        <StatCard
          label="Internships"
          icon={IconBriefcase}
          value={metrics?.internshipCount ?? "—"}
          loading={loadingNumbers}
          hint="All statuses"
          href="/admin/internships"
        />
        <StatCard
          label="Applications"
          icon={IconAudit}
          value={metrics?.applicationCount ?? "—"}
          loading={loadingNumbers}
          hint="Across all internships"
        />
        <StatCard
          label="Failed jobs"
          icon={IconServer}
          value={failedJobs ?? "—"}
          loading={summary.loading && failedJobs === null}
          tone={failedJobs ? "red" : "neutral"}
          hint={
            failedJobs
              ? "See what failed →"
              : failedJobs === 0
                ? "Emails and scheduled tasks"
                : undefined
          }
          href="/admin/system"
        />
      </section>

      {/* Needs attention + system */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Panel
          title="Awaiting approval"
          description="New internship postings from companies"
          actions={<ViewAll href="/admin/internships" />}
        >
          <ListBody
            loading={pending.loading && !pending.data}
            error={pending.error}
            onRetry={pending.reload}
            empty={
              <EmptyState
                icon={IconBriefcase}
                title="Nothing to approve"
                description="New postings from companies will appear here."
              />
            }
            items={pending.data}
            render={(item) => (
              <Link
                href="/admin/internships"
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {item.companyName} · submitted {timeAgo(item.createdAt)}
                  </p>
                </div>
                <Badge tone="amber">Review</Badge>
              </Link>
            )}
            keyOf={(item) => item.id}
          />
        </Panel>

        <Panel
          title="Unread messages"
          description="From the website's contact form"
          actions={<ViewAll href="/admin/messages" />}
        >
          <ListBody
            loading={messages.loading && !messages.data}
            error={messages.error}
            onRetry={messages.reload}
            empty={
              <EmptyState
                icon={IconInbox}
                title="Inbox is clear"
                description="New contact-form messages will appear here."
              />
            }
            items={messages.data}
            render={(item) => (
              <Link href="/admin/messages" className="block px-4 py-3 hover:bg-zinc-50">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {item.topic}
                  </p>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {timeAgo(item.createdAt)}
                  </span>
                </div>
                <p className="truncate text-xs text-zinc-500">
                  {item.fullName} — {item.message}
                </p>
              </Link>
            )}
            keyOf={(item) => item.id}
          />
        </Panel>

        <Panel
          title="System status"
          description="Live check of the API and database"
          actions={<ViewAll href="/admin/system" label="Details" />}
        >
          <SystemStatus
            health={health.data}
            error={health.error}
            loading={health.loading && !health.data}
            failedJobs={failedJobs}
            onRetry={health.reload}
          />
        </Panel>
      </div>

      {/* Recent activity */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Panel
          className="xl:col-span-3"
          title="Recent payments"
          actions={<ViewAll href="/admin/payments" />}
        >
          <ListBody
            loading={payments.loading && !payments.data}
            error={payments.error}
            onRetry={payments.reload}
            empty={
              <EmptyState
                icon={IconCard}
                title="No payments yet"
                description="Course payments will appear here as soon as students pay."
              />
            }
            items={payments.data}
            render={(p) => (
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {p.user?.name || p.user?.email || "Unknown customer"}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {p.programmeTitle || "Programme"} · {timeAgo(p.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-medium tabular-nums text-zinc-900">
                    {formatMoney(p.amount, p.currency)}
                  </span>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            )}
            keyOf={(p) => p.id}
          />
        </Panel>

        <Panel
          className="xl:col-span-2"
          title="Recent activity"
          description="Sign-ins, exports and other recorded events"
          actions={<ViewAll href="/admin/audit" />}
        >
          <ListBody
            loading={activity.loading && !activity.data}
            error={activity.error}
            onRetry={activity.reload}
            empty={<EmptyState icon={IconAudit} title="No activity recorded yet" />}
            items={activity.data}
            render={(log) => (
              <div className="flex items-start justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-900">
                    {eventLabel(log.action)}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {log.user?.email || "System"}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-zinc-400">
                  {timeAgo(log.createdAt)}
                </span>
              </div>
            )}
            keyOf={(log) => log.id}
          />
        </Panel>
      </div>
    </>
  );
}

function ViewAll({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
    >
      {label}
      <IconArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function ListBody<T>({
  items,
  loading,
  error,
  onRetry,
  empty,
  render,
  keyOf,
}: {
  items: T[] | undefined;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  empty: React.ReactNode;
  render: (item: T) => React.ReactNode;
  keyOf: (item: T) => string;
}) {
  if (loading) {
    return (
      <div className="space-y-3 px-4 py-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }
  if (error && !items) return <ErrorState message={error} onRetry={onRetry} />;
  if (!items || items.length === 0) return <>{empty}</>;
  return (
    <ul className="divide-y divide-zinc-100">
      {items.map((item) => (
        <li key={keyOf(item)}>{render(item)}</li>
      ))}
    </ul>
  );
}

function SystemStatus({
  health,
  error,
  loading,
  failedJobs,
  onRetry,
}: {
  health: HealthReport | undefined;
  error: string | null;
  loading: boolean;
  failedJobs: number | null;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3 px-4 py-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }
  if (error && !health) {
    return (
      <ErrorState message={`The API health check failed: ${error}`} onRetry={onRetry} />
    );
  }

  const apiUp = health?.status === "UP";
  const db = health?.checks?.database;
  const rows: { label: string; value: React.ReactNode; ok: boolean | null }[] = [
    { label: "API", value: apiUp ? "Running" : health?.status || "Unknown", ok: apiUp },
    {
      label: "Database",
      value: db
        ? `${db.status === "healthy" ? "Healthy" : db.status}${db.latencyMs !== undefined ? ` · ${db.latencyMs} ms` : ""}`
        : "Unknown",
      ok: db ? db.status === "healthy" : null,
    },
    {
      label: "Background jobs",
      value:
        failedJobs === null
          ? "Unknown"
          : failedJobs > 0
            ? plural(failedJobs, "failed job")
            : "No failures",
      ok: failedJobs === null ? null : failedJobs === 0,
    },
    { label: "Up for", value: formatUptime(health?.uptimeSeconds), ok: null },
  ];

  return (
    <ul className="divide-y divide-zinc-100">
      {rows.map((row) => (
        <li
          key={row.label}
          className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
        >
          <span className="flex items-center gap-2 text-zinc-600">
            <span
              aria-hidden="true"
              className={cx(
                "h-2 w-2",
                row.ok === null ? "bg-zinc-300" : row.ok ? "bg-emerald-500" : "bg-red-500"
              )}
            />
            {row.label}
          </span>
          <span className="font-medium text-zinc-900">{row.value}</span>
        </li>
      ))}
    </ul>
  );
}
