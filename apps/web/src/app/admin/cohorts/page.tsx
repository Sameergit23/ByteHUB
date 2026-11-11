"use client";

import { useMemo, useState } from "react";
import { useAdmin } from "../../../components/admin/AdminShell";
import { IconGraduation } from "../../../components/admin/icons";
import type {
  AdminCohort,
  CohortCompletionSummary,
  Envelope,
} from "../../../components/admin/types";
import {
  Badge,
  Button,
  DataTable,
  Dialog,
  EmptyState,
  Field,
  PageHeader,
  Panel,
  RefreshButton,
  SearchInput,
  cx,
  inputClass,
  type Column,
} from "../../../components/admin/ui";
import {
  runAdminAction,
  useAdminResource,
} from "../../../components/admin/useAdminResource";
import { apiFetch } from "../../../lib/api";
import { formatDate, formatMoney, formatWorkMode } from "../../../lib/format";

function cohortState(c: AdminCohort): {
  label: string;
  tone: "green" | "neutral" | "amber" | "blue";
} {
  const now = Date.now();
  if (new Date(c.endDate).getTime() < now) return { label: "Finished", tone: "neutral" };
  if (new Date(c.startDate).getTime() <= now) return { label: "Running", tone: "blue" };
  if (c.published === false) return { label: "Hidden", tone: "neutral" };
  if (c.seatsLeft <= 0) return { label: "Full", tone: "amber" };
  return { label: "Open", tone: "green" };
}

export default function AdminCohortsPage() {
  const { notify } = useAdmin();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AdminCohort | null>(null);

  const cohorts = useAdminResource<AdminCohort[], Envelope<AdminCohort[]>>(
    "/admin/cohorts",
    (res) => res.data
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!cohorts.data || !q) return cohorts.data;
    return cohorts.data.filter((c) =>
      [c.programme?.title, c.name, c.cohortCode].some((v) => v?.toLowerCase().includes(q))
    );
  }, [cohorts.data, search]);

  const columns: Column<AdminCohort>[] = [
    {
      key: "cohort",
      header: "Programme",
      render: (c) => (
        <div className="max-w-[15rem]">
          <p className="truncate font-medium text-zinc-900">
            {c.programme?.title || c.name}
          </p>
          <p className="truncate text-xs text-zinc-500">
            {c.name} · <span className="font-mono">{c.cohortCode}</span>
          </p>
        </div>
      ),
    },
    {
      key: "dates",
      header: "Starts",
      className: "whitespace-nowrap",
      render: (c) => (
        <div title={`${formatDate(c.startDate)} – ${formatDate(c.endDate)}`}>
          <p className="text-zinc-900">{formatDate(c.startDate)}</p>
          <p className="text-xs text-zinc-500">
            {c.durationWeeks} weeks · {formatWorkMode(c.mode)}
          </p>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      hideBelow: "xl",
      className: "whitespace-nowrap tabular-nums",
      render: (c) =>
        c.priceAmount > 0 ? formatMoney(c.priceAmount, c.currency || "INR") : "Free",
    },
    {
      key: "seats",
      header: "Seats",
      render: (c) => <SeatBar total={c.seatsTotal} left={c.seatsLeft} />,
    },
    {
      key: "enrolled",
      header: "Enrolments",
      align: "right",
      hideBelow: "xl",
      className: "tabular-nums",
      render: (c) => c._count?.enrollments ?? 0,
    },
    {
      key: "state",
      header: "Status",
      render: (c) => {
        const state = cohortState(c);
        return <Badge tone={state.tone}>{state.label}</Badge>;
      },
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (c) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditing(c)}
          aria-label={`Manage ${c.cohortCode}`}
        >
          Manage
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Programmes & cohorts"
        description="Every scheduled cohort, how full it is, and its price. Prices and dates are edited in the database for now."
        actions={<RefreshButton onClick={cohorts.reload} busy={cohorts.loading} />}
      />

      <Panel>
        <div className="border-b border-zinc-200 px-4 py-3">
          <SearchInput
            label="Search cohorts"
            placeholder="Search programme, cohort or code"
            value={search}
            onChange={setSearch}
          />
        </div>
        <DataTable
          caption="Cohorts"
          columns={columns}
          rows={rows}
          rowKey={(c) => c.id}
          loading={cohorts.loading}
          error={cohorts.error}
          onRetry={cohorts.reload}
          empty={
            <EmptyState
              icon={IconGraduation}
              title={search ? "No cohorts match" : "No cohorts scheduled"}
              description={
                search ? "Try a different search." : "Cohorts are added in the database."
              }
            />
          }
        />
      </Panel>

      {editing && (
        <EditSeatsDialog
          cohort={editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            notify("success", message);
            cohorts.reload();
          }}
          onError={(message) => notify("error", message)}
        />
      )}
    </>
  );
}

function SeatBar({ total, left }: { total: number; left: number }) {
  const taken = Math.max(0, total - left);
  const percent = total > 0 ? Math.min(100, Math.round((taken / total) * 100)) : 0;
  return (
    <div className="w-28">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium tabular-nums text-zinc-900">
          {left} of {total} left
        </span>
        <span className="tabular-nums text-zinc-500">{percent}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full bg-zinc-100" aria-hidden="true">
        <div
          className={cx("h-full", percent >= 90 ? "bg-amber-500" : "bg-blue-600")}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function EditSeatsDialog({
  cohort,
  onClose,
  onSaved,
  onError,
}: {
  cohort: AdminCohort;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) {
  const taken = Math.max(0, cohort.seatsTotal - cohort.seatsLeft);
  const [total, setTotal] = useState(String(cohort.seatsTotal));
  const [left, setLeft] = useState(String(cohort.seatsLeft));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const hasEnded = new Date(cohort.endDate).getTime() <= Date.now();

  // Completes every student with a confirmed seat; each gets their certificate by email.
  const finishCohort = async () => {
    setFinishing(true);
    const result = await runAdminAction(() =>
      apiFetch<Envelope<CohortCompletionSummary>>(
        `/admin/cohorts/${cohort.id}/complete`,
        {
          method: "POST",
          body: "{}",
        }
      )
    );
    setFinishing(false);
    if (!result.ok) {
      onError(result.message);
      return;
    }
    const summary = result.value.data;
    onSaved(
      summary.completed === 0 && summary.failed.length === 0
        ? `${cohort.cohortCode} has no students with a confirmed seat to complete.`
        : `${summary.completed} ${summary.completed === 1 ? "student" : "students"} in ${cohort.cohortCode} marked completed; ${summary.certificatesIssued} ${summary.certificatesIssued === 1 ? "certificate" : "certificates"} emailed.${
            summary.failed.length
              ? ` ${summary.failed.length} could not be completed (see the API logs).`
              : ""
          }`
    );
  };

  // Changing the total keeps the number of taken seats the same.
  const onTotalChange = (value: string) => {
    setTotal(value);
    const nextTotal = Number(value);
    if (Number.isInteger(nextTotal) && nextTotal >= 0) {
      setLeft(String(Math.max(0, Math.min(nextTotal, nextTotal - taken))));
    }
  };

  const save = async () => {
    const seatsTotal = Number(total);
    const seatsLeft = Number(left);
    if (!Number.isInteger(seatsTotal) || seatsTotal < 0) {
      setError("Total seats must be a whole number, 0 or more.");
      return;
    }
    if (!Number.isInteger(seatsLeft) || seatsLeft < 0 || seatsLeft > seatsTotal) {
      setError(`Seats left must be a whole number between 0 and ${seatsTotal}.`);
      return;
    }
    setError(null);
    setSaving(true);
    const result = await runAdminAction(() =>
      apiFetch(`/admin/cohorts/${cohort.id}/capacity`, {
        method: "PATCH",
        body: JSON.stringify({ seatsTotal, seatsLeft }),
      })
    );
    setSaving(false);
    if (result.ok) {
      onSaved(`${cohort.cohortCode} now has ${seatsLeft} of ${seatsTotal} seats left.`);
    } else {
      onError(result.message);
    }
  };

  return (
    <Dialog
      open
      onClose={saving || finishing ? () => undefined : onClose}
      title={`Manage · ${cohort.cohortCode}`}
      description={`${cohort.programme?.title || cohort.name}. ${taken} ${taken === 1 ? "seat is" : "seats are"} taken or reserved right now.`}
      footer={
        <>
          <Button onClick={onClose} disabled={saving || finishing}>
            Close
          </Button>
          <Button variant="primary" onClick={save} disabled={saving || finishing}>
            {saving ? "Saving…" : "Save seats"}
          </Button>
        </>
      }
    >
      {error && (
        <p
          role="alert"
          className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Total seats" htmlFor="seats-total">
          <input
            id="seats-total"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={total}
            onChange={(e) => onTotalChange(e.target.value)}
            className={inputClass}
            data-autofocus
          />
        </Field>
        <Field label="Seats left" htmlFor="seats-left">
          <input
            id="seats-left"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={left}
            onChange={(e) => setLeft(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <p className="text-xs text-zinc-500">
        Students can book while seats are left. Lowering seats never cancels existing
        enrolments.
      </p>

      <div className="border-t border-zinc-200 pt-4">
        <p className="text-sm font-medium text-zinc-900">Finish this cohort</p>
        <p className="mt-1 text-xs text-zinc-500">
          Marks every student with a confirmed seat as completed and emails each of them
          their certificate.
          {!hasEnded && ` This cohort runs until ${formatDate(cohort.endDate)}.`}
        </p>
        {!confirmFinish ? (
          <Button
            size="sm"
            className="mt-3"
            onClick={() => setConfirmFinish(true)}
            disabled={saving || finishing}
          >
            Complete cohort &amp; issue certificates
          </Button>
        ) : (
          <div
            className="mt-3 flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Confirm"
          >
            <span className="text-xs font-medium text-amber-800">
              {hasEnded
                ? "Issue certificates to everyone now?"
                : "The cohort hasn't ended yet. Issue certificates anyway?"}
            </span>
            <Button
              size="sm"
              variant="primary"
              onClick={finishCohort}
              disabled={finishing}
            >
              {finishing ? "Issuing…" : "Yes, issue certificates"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmFinish(false)}
              disabled={finishing}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
