"use client";

import { useState } from "react";
import { IconAudit } from "../../../components/admin/icons";
import type { AdminAuditLog, Envelope, Paged } from "../../../components/admin/types";
import {
  Button,
  DataTable,
  DescriptionList,
  Dialog,
  EmptyState,
  PageHeader,
  Pagination,
  Panel,
  RefreshButton,
  eventLabel,
  humanize,
  timeAgo,
  type Column,
} from "../../../components/admin/ui";
import { useAdminResource } from "../../../components/admin/useAdminResource";
import { formatDateTime } from "../../../lib/format";

const PAGE_SIZE = 50;

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<AdminAuditLog | null>(null);

  const logs = useAdminResource<Paged<AdminAuditLog>, Envelope<Paged<AdminAuditLog>>>(
    `/admin/audit-logs?limit=${PAGE_SIZE}&page=${page}`,
    (res) => res.data
  );

  const columns: Column<AdminAuditLog>[] = [
    {
      key: "time",
      header: "Time",
      className: "whitespace-nowrap",
      render: (log) => (
        <div>
          <p className="text-zinc-900">{formatDateTime(log.createdAt)}</p>
          <p className="text-xs text-zinc-500">{timeAgo(log.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "action",
      header: "Event",
      render: (log) => (
        <button
          type="button"
          onClick={() => setOpen(log)}
          className="block max-w-[20rem] text-left"
          aria-label={`${eventLabel(log.action)}: show details`}
        >
          <span className="block truncate text-zinc-900 hover:text-blue-700">
            {eventLabel(log.action)}
          </span>
          <span className="block truncate font-mono text-[11px] text-zinc-500">
            {log.action}
          </span>
        </button>
      ),
    },
    {
      key: "entity",
      header: "Record",
      hideBelow: "xl",
      render: (log) => (
        <div className="max-w-[14rem]">
          <p className="truncate text-zinc-700">{humanize(log.entityType)}</p>
          <p
            className="truncate font-mono text-[11px] text-zinc-500"
            title={log.entityId}
          >
            {log.entityId}
          </p>
        </div>
      ),
    },
    {
      key: "actor",
      header: "By",
      render: (log) => (
        <span className="block max-w-[14rem] truncate text-zinc-700">
          {log.user?.email || "System"}
        </span>
      ),
    },
    {
      key: "ip",
      header: "IP address",
      className: "whitespace-nowrap font-mono text-xs text-zinc-600",
      render: (log) => log.ipAddress || "—",
    },
  ];

  return (
    <>
      <PageHeader
        title="Audit log"
        description="A permanent record of sign-ins, password resets, payments, refunds, data exports and other sensitive actions."
        actions={<RefreshButton onClick={logs.reload} busy={logs.loading} />}
      />
      <Panel>
        <DataTable
          caption="Audit log"
          columns={columns}
          rows={logs.data?.items}
          rowKey={(log) => log.id}
          loading={logs.loading}
          error={logs.error}
          onRetry={logs.reload}
          skeletonRows={10}
          empty={<EmptyState icon={IconAudit} title="Nothing recorded yet" />}
        />
        <Pagination meta={logs.data?.meta} onPageChange={setPage} itemLabel="events" />
      </Panel>

      <Dialog
        open={open !== null}
        onClose={() => setOpen(null)}
        wide
        title={open ? eventLabel(open.action) : ""}
        description={open ? formatDateTime(open.createdAt) : undefined}
        footer={<Button onClick={() => setOpen(null)}>Close</Button>}
      >
        {open && (
          <>
            <DescriptionList
              items={[
                {
                  label: "Event code",
                  value: <span className="font-mono text-xs">{open.action}</span>,
                },
                {
                  label: "By",
                  value: open.user ? `${open.user.name} (${open.user.email})` : "System",
                },
                { label: "Record type", value: humanize(open.entityType) },
                {
                  label: "Record ID",
                  value: (
                    <span className="break-all font-mono text-xs">{open.entityId}</span>
                  ),
                },
                {
                  label: "IP address",
                  value: (
                    <span className="font-mono text-xs">{open.ipAddress || "—"}</span>
                  ),
                },
              ]}
            />
            {open.details !== null && open.details !== undefined && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-zinc-500">Details</p>
                <pre className="max-h-64 overflow-auto bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-100">
                  {JSON.stringify(open.details, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </Dialog>
    </>
  );
}
