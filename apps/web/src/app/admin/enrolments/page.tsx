"use client";

import { useState } from "react";
import { useAdmin } from "../../../components/admin/AdminShell";
import { IconClipboard, IconExternal } from "../../../components/admin/icons";
import type {
  AdminEnrolment,
  CompletionResult,
  Envelope,
  Paged,
} from "../../../components/admin/types";
import {
  Button,
  ButtonLink,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ExportButton,
  PageHeader,
  Pagination,
  Panel,
  RefreshButton,
  StatusBadge,
  timeAgo,
  type Column,
} from "../../../components/admin/ui";
import {
  runAdminAction,
  useAdminResource,
} from "../../../components/admin/useAdminResource";
import { apiFetch } from "../../../lib/api";
import { formatDate, formatDateTime, formatMoney } from "../../../lib/format";

const PAGE_SIZE = 25;

export default function AdminEnrolmentsPage() {
  const { notify, refreshSummary } = useAdmin();
  const [page, setPage] = useState(1);
  const [completing, setCompleting] = useState<AdminEnrolment | null>(null);
  const [busy, setBusy] = useState(false);

  const enrolments = useAdminResource<
    Paged<AdminEnrolment>,
    Envelope<Paged<AdminEnrolment>>
  >(`/admin/enrolments?limit=${PAGE_SIZE}&page=${page}`, (res) => res.data);

  const markCompleted = async (enrolment: AdminEnrolment) => {
    setBusy(true);
    const result = await runAdminAction(() =>
      apiFetch<Envelope<CompletionResult>>(`/admin/enrolments/${enrolment.id}/complete`, {
        method: "POST",
        body: "{}",
      })
    );
    setBusy(false);
    setCompleting(null);
    if (!result.ok) {
      notify("error", result.message);
      return;
    }
    const { certificateCode, newlyIssued } = result.value.data;
    const name = enrolment.user?.name || "The student";
    notify(
      "success",
      newlyIssued
        ? `${name} is marked completed. Certificate ${certificateCode} was emailed to them.`
        : `${name} was already completed (certificate ${certificateCode}).`
    );
    enrolments.reload();
    refreshSummary();
  };

  const columns: Column<AdminEnrolment>[] = [
    {
      key: "student",
      header: "Student",
      render: (e) => (
        <div className="max-w-[16rem]">
          <p className="truncate font-medium text-zinc-900">
            {e.user?.name || "Unknown"}
          </p>
          <p className="truncate text-xs text-zinc-500">{e.user?.email}</p>
        </div>
      ),
    },
    {
      key: "programme",
      header: "Programme",
      render: (e) => (
        <div className="max-w-[16rem]">
          <p className="truncate text-zinc-900">{e.cohort?.programme?.title || "—"}</p>
          <p className="truncate font-mono text-xs text-zinc-500">
            {e.cohort?.cohortCode}
          </p>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (e) => <StatusBadge status={e.status} /> },
    {
      key: "price",
      header: "Price",
      hideBelow: "xl",
      className: "whitespace-nowrap tabular-nums",
      render: (e) =>
        e.priceAmount && e.priceAmount > 0
          ? formatMoney(e.priceAmount, e.currency || "INR")
          : "—",
    },
    {
      key: "hold",
      header: "Seat held until",
      hideBelow: "xl",
      className: "whitespace-nowrap text-zinc-600",
      render: (e) =>
        e.status === "PENDING" && e.reservedUntil ? formatDateTime(e.reservedUntil) : "—",
    },
    {
      key: "created",
      header: "Enrolled",
      className: "whitespace-nowrap",
      render: (e) => <span title={timeAgo(e.createdAt)}>{formatDate(e.createdAt)}</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (e) => {
        if (e.status === "ACTIVE") {
          return (
            <Button
              size="sm"
              onClick={() => setCompleting(e)}
              aria-label={`Mark ${e.user?.name || "student"} as completed`}
            >
              Mark completed
            </Button>
          );
        }
        if (e.certificate && !e.certificate.revokedAt) {
          return (
            <ButtonLink
              href={`/verify/${encodeURIComponent(e.certificate.certificateCode)}`}
              size="sm"
              variant="ghost"
              external
            >
              Certificate
              <IconExternal className="h-3.5 w-3.5" />
            </ButtonLink>
          );
        }
        return null;
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Enrolments"
        description="Students who reserved or paid for a seat. Mark a student completed when they finish: their certificate is created and emailed automatically."
        actions={
          <>
            <ExportButton entity="enrolments" />
            <RefreshButton onClick={enrolments.reload} busy={enrolments.loading} />
          </>
        }
      />
      <Panel>
        <DataTable
          caption="Enrolments"
          columns={columns}
          rows={enrolments.data?.items}
          rowKey={(e) => e.id}
          loading={enrolments.loading}
          error={enrolments.error}
          onRetry={enrolments.reload}
          empty={
            <EmptyState
              icon={IconClipboard}
              title="No enrolments yet"
              description="When a student books a seat in a programme, it appears here."
            />
          }
        />
        <Pagination
          meta={enrolments.data?.meta}
          onPageChange={setPage}
          itemLabel="enrolments"
        />
      </Panel>

      <ConfirmDialog
        open={completing !== null}
        onClose={() => setCompleting(null)}
        onConfirm={() => completing && void markCompleted(completing)}
        busy={busy}
        title={`Mark ${completing?.user?.name || "this student"} as completed?`}
        description={`Their certificate for ${
          completing?.cohort?.programme?.title || "the programme"
        } is created and emailed to ${completing?.user?.email || "them"} straight away. This can't be undone from the admin panel.`}
        confirmLabel="Mark completed"
      />
    </>
  );
}
