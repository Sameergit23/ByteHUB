"use client";

import { useState } from "react";
import { useAdmin } from "../../../components/admin/AdminShell";
import { IconCheck } from "../../../components/admin/icons";
import type {
  Envelope,
  FailedJob,
  HealthReport,
  JobStats,
} from "../../../components/admin/types";
import {
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  Notice,
  PageHeader,
  Panel,
  RefreshButton,
  Skeleton,
  StatCard,
  cx,
  formatUptime,
  humanize,
  timeAgo,
  type Column,
} from "../../../components/admin/ui";
import {
  runAdminAction,
  useAdminResource,
} from "../../../components/admin/useAdminResource";
import { apiFetch } from "../../../lib/api";

export default function AdminSystemPage() {
  const { notify, refreshSummary } = useAdmin();
  const [retrying, setRetrying] = useState<FailedJob | null>(null);
  const [busy, setBusy] = useState(false);

  const health = useAdminResource<HealthReport, HealthReport>("/health", (res) => res);
  const stats = useAdminResource<JobStats, Envelope<JobStats>>(
    "/admin/jobs/stats",
    (res) => res.data
  );
  const failed = useAdminResource<FailedJob[], Envelope<FailedJob[]>>(
    "/admin/jobs/failed",
    (res) => res.data
  );

  const refreshAll = () => {
    health.reload();
    stats.reload();
    failed.reload();
    refreshSummary();
  };

  const retry = async (job: FailedJob) => {
    setBusy(true);
    const result = await runAdminAction(() =>
      apiFetch(`/admin/jobs/retry/${encodeURIComponent(job.id)}`, {
        method: "POST",
        body: "{}",
      })
    );
    setBusy(false);
    setRetrying(null);
    if (result.ok) {
      notify("success", `"${humanize(job.name)}" was sent to run again.`);
      refreshAll();
    } else {
      notify("error", result.message);
    }
  };

  const db = health.data?.checks?.database;
  const memory = health.data?.checks?.memory;
  const apiUp = health.data?.status === "UP";

  const columns: Column<FailedJob>[] = [
    {
      key: "job",
      header: "Job",
      render: (job) => (
        <div className="max-w-[11rem]">
          <p className="truncate font-medium text-zinc-900">{humanize(job.name)}</p>
          <p className="truncate font-mono text-[11px] text-zinc-500" title={job.id}>
            {job.id}
          </p>
        </div>
      ),
    },
    {
      key: "attempts",
      header: "Attempts",
      className: "whitespace-nowrap tabular-nums",
      render: (job) => `${job.attemptsMade} of ${job.maxAttempts}`,
    },
    {
      key: "failed",
      header: "Failed",
      className: "whitespace-nowrap text-zinc-600",
      render: (job) => timeAgo(job.failedAt || job.createdAt),
    },
    {
      key: "reason",
      header: "Reason",
      render: (job) => {
        const reason = (job.failedReason || "Unknown error").trim();
        const firstLine = reason.split("\n").find((line) => line.trim()) || reason;
        return (
          <p
            className="max-w-[14rem] truncate text-sm text-red-700 xl:max-w-[28rem]"
            title={reason}
          >
            {firstLine}
          </p>
        );
      },
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (job) => (
        <Button
          size="sm"
          onClick={() => setRetrying(job)}
          aria-label={`Retry ${humanize(job.name)}`}
        >
          Retry
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="System health"
        description="Whether the API and database are working, and background jobs (emails, seat-hold expiry, payment checks) that failed."
        actions={
          <RefreshButton
            onClick={refreshAll}
            busy={health.loading || stats.loading || failed.loading}
          />
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel title="API and database" className="xl:col-span-2">
          {health.loading && !health.data ? (
            <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : health.error && !health.data ? (
            <ErrorState
              message={`The health check failed: ${health.error}. The API may be restarting; wait a minute and try again.`}
              onRetry={health.reload}
            />
          ) : (
            <div className="grid grid-cols-2 divide-zinc-100 sm:grid-cols-4 sm:divide-x">
              <HealthTile
                label="API"
                ok={apiUp}
                value={apiUp ? "Running" : health.data?.status || "Unknown"}
              />
              <HealthTile
                label="Database"
                ok={db ? db.status === "healthy" : null}
                value={
                  db
                    ? `${db.status === "healthy" ? "Healthy" : db.status}${db.latencyMs !== undefined ? ` · ${db.latencyMs} ms` : ""}`
                    : "Unknown"
                }
              />
              <HealthTile
                label="Up for"
                value={formatUptime(health.data?.uptimeSeconds)}
              />
              <HealthTile
                label="Memory in use"
                value={memory ? `${memory.rssMb} MB` : "—"}
                hint={
                  memory
                    ? `Heap ${memory.heapUsedMb} of ${memory.heapTotalMb} MB`
                    : undefined
                }
              />
            </div>
          )}
          {health.data && (
            <p className="border-t border-zinc-200 px-4 py-2.5 text-xs text-zinc-500">
              {health.data.service || "API"}{" "}
              {health.data.version ? `v${health.data.version}` : ""} ·{" "}
              {health.data.environment || "unknown environment"}
            </p>
          )}
        </Panel>

        <div className="grid grid-cols-3 gap-3 xl:grid-cols-1">
          <StatCard
            label="Jobs running"
            value={stats.data?.activeCount ?? "—"}
            loading={stats.loading && !stats.data}
          />
          <StatCard
            label="Jobs completed"
            value={stats.data?.completedCount ?? "—"}
            loading={stats.loading && !stats.data}
            hint="Since the API started"
          />
          <StatCard
            label="Jobs failed"
            value={stats.data?.failedDlqCount ?? "—"}
            loading={stats.loading && !stats.data}
            tone={stats.data?.failedDlqCount ? "red" : "neutral"}
          />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <Notice tone="blue">
          Background jobs run inside the API. On Render&apos;s free plan the API sleeps
          after 15 minutes without visitors, and this list starts empty again after each
          restart.
        </Notice>
        <Panel
          title="Failed jobs"
          description="Each job was tried several times before it was stopped."
        >
          <DataTable
            caption="Failed background jobs"
            columns={columns}
            rows={failed.data}
            rowKey={(job) => job.id}
            loading={failed.loading}
            error={failed.error}
            onRetry={failed.reload}
            skeletonRows={3}
            empty={
              <EmptyState
                icon={IconCheck}
                title="No failed jobs"
                description="Emails and scheduled tasks are running normally."
              />
            }
          />
        </Panel>
      </div>

      <ConfirmDialog
        open={retrying !== null}
        onClose={() => setRetrying(null)}
        onConfirm={() => retrying && void retry(retrying)}
        busy={busy}
        title="Run this job again?"
        description={
          retrying?.name === "SEND_EMAIL"
            ? "The email will be sent again. Only retry if the cause of the failure is fixed."
            : "The job runs again straight away. Only retry if the cause of the failure is fixed."
        }
        confirmLabel="Retry job"
      />
    </>
  );
}

function HealthTile({
  label,
  value,
  ok = null,
  hint,
}: {
  label: string;
  value: string;
  ok?: boolean | null;
  hint?: string;
}) {
  return (
    <div className="px-4 py-4">
      <p className="flex items-center gap-2 text-xs font-medium text-zinc-500">
        {ok !== null && (
          <span
            aria-hidden="true"
            className={cx("h-2 w-2", ok ? "bg-emerald-500" : "bg-red-500")}
          />
        )}
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-zinc-900">{value}</p>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
