"use client";

import { useState } from "react";
import { useAdmin } from "../../../components/admin/AdminShell";
import { IconCard } from "../../../components/admin/icons";
import type { AdminPayment, Envelope, Paged } from "../../../components/admin/types";
import {
  Button,
  DataTable,
  Dialog,
  EmptyState,
  ExportButton,
  Field,
  Notice,
  PageHeader,
  Pagination,
  Panel,
  RefreshButton,
  SelectField,
  StatusBadge,
  inputClass,
  timeAgo,
  type Column,
} from "../../../components/admin/ui";
import {
  runAdminAction,
  useAdminResource,
} from "../../../components/admin/useAdminResource";
import { apiFetch } from "../../../lib/api";
import { formatDate, formatMoney } from "../../../lib/format";

type StatusFilter =
  "ALL" | "PAID" | "CREATED" | "PENDING" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";

const PAGE_SIZE = 25;
const REFUNDABLE = new Set(["PAID", "PARTIALLY_REFUNDED"]);

export default function AdminPaymentsPage() {
  const { notify, refreshSummary } = useAdmin();
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [refunding, setRefunding] = useState<AdminPayment | null>(null);

  const payments = useAdminResource<Paged<AdminPayment>, Envelope<Paged<AdminPayment>>>(
    `/admin/payments?limit=${PAGE_SIZE}&page=${page}${status === "ALL" ? "" : `&status=${status}`}`,
    (res) => res.data
  );

  const columns: Column<AdminPayment>[] = [
    {
      key: "order",
      header: "Order",
      render: (p) => (
        <div className="whitespace-nowrap">
          <p className="font-mono text-xs text-zinc-900">{p.orderId}</p>
          <p className="text-xs text-zinc-500" title={timeAgo(p.createdAt)}>
            {formatDate(p.createdAt)} ·{" "}
            <span className="capitalize">{p.provider.toLowerCase()}</span>
          </p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (p) => (
        <div className="max-w-[14rem]">
          <p className="truncate text-zinc-900">{p.user?.name || "—"}</p>
          <p className="truncate text-xs text-zinc-500">{p.user?.email}</p>
        </div>
      ),
    },
    {
      key: "programme",
      header: "Programme",
      hideBelow: "xl",
      render: (p) => (
        <div className="max-w-[14rem]">
          <p className="truncate text-zinc-900">{p.programmeTitle || "—"}</p>
          {p.cohortCode && (
            <p className="truncate font-mono text-xs text-zinc-500">{p.cohortCode}</p>
          )}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      className: "whitespace-nowrap font-medium tabular-nums text-zinc-900",
      render: (p) => formatMoney(p.amount, p.currency),
    },
    {
      key: "refunded",
      header: "Refunded",
      align: "right",
      hideBelow: "xl",
      className: "whitespace-nowrap tabular-nums text-zinc-600",
      render: (p) =>
        p.refundedAmount > 0 ? formatMoney(p.refundedAmount, p.currency) : "—",
    },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (p) =>
        REFUNDABLE.has(p.status) ? (
          <Button
            size="sm"
            variant="danger-outline"
            onClick={() => setRefunding(p)}
            aria-label={`Refund order ${p.orderId}`}
          >
            Refund
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Payments & refunds"
        description="Every course payment and its status. Refunds are recorded here and sent from the Cashfree dashboard."
        actions={
          <>
            <ExportButton entity="payments" />
            <RefreshButton onClick={payments.reload} busy={payments.loading} />
          </>
        }
      />

      <Panel>
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
          <SelectField<StatusFilter>
            label="Status"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={[
              { value: "ALL", label: "All payments" },
              { value: "PAID", label: "Paid" },
              { value: "CREATED", label: "Created (not paid yet)" },
              { value: "PENDING", label: "Pending" },
              { value: "FAILED", label: "Failed" },
              { value: "REFUNDED", label: "Refunded" },
              { value: "PARTIALLY_REFUNDED", label: "Partly refunded" },
            ]}
          />
        </div>
        <DataTable
          caption="Payments"
          columns={columns}
          rows={payments.data?.items}
          rowKey={(p) => p.id}
          loading={payments.loading}
          error={payments.error}
          onRetry={payments.reload}
          empty={
            <EmptyState
              icon={IconCard}
              title={
                status === "ALL" ? "No payments yet" : "No payments with this status"
              }
              description={
                status === "ALL"
                  ? "Payments appear here as soon as a student starts checkout."
                  : "Choose another status to see more payments."
              }
            />
          }
        />
        <Pagination
          meta={payments.data?.meta}
          onPageChange={setPage}
          itemLabel="payments"
        />
      </Panel>

      {refunding && (
        <RefundDialog
          payment={refunding}
          onClose={() => setRefunding(null)}
          onDone={(message) => {
            setRefunding(null);
            notify("success", message);
            payments.reload();
            refreshSummary();
          }}
        />
      )}
    </>
  );
}

function RefundDialog({
  payment,
  onClose,
  onDone,
}: {
  payment: AdminPayment;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const remainingMinor = payment.amount - payment.refundedAmount;
  const [amount, setAmount] = useState(String(remainingMinor / 100));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const amountMinor = Math.round(Number(amount) * 100);
    if (!reason.trim()) {
      setError("Enter a reason. It is saved in the audit log.");
      return;
    }
    if (
      !Number.isFinite(amountMinor) ||
      amountMinor <= 0 ||
      amountMinor > remainingMinor
    ) {
      setError(
        `Enter an amount between ${formatMoney(1, payment.currency)} and ${formatMoney(remainingMinor, payment.currency)}.`
      );
      return;
    }
    setError(null);
    setSaving(true);
    const result = await runAdminAction(() =>
      apiFetch("/payments/refund", {
        method: "POST",
        body: JSON.stringify({
          paymentId: payment.id,
          amount: amountMinor,
          reason: reason.trim(),
        }),
      })
    );
    setSaving(false);
    if (result.ok) {
      onDone(
        `Refund of ${formatMoney(amountMinor, payment.currency)} recorded for ${payment.orderId}. Now send the money back from the Cashfree dashboard.`
      );
    } else {
      setError(result.message);
    }
  };

  return (
    <Dialog
      open
      wide
      onClose={saving ? () => undefined : onClose}
      title={`Refund ${payment.orderId}`}
      description={`${payment.user?.email || "Customer"} paid ${formatMoney(payment.amount, payment.currency)}${
        payment.refundedAmount > 0
          ? `, ${formatMoney(payment.refundedAmount, payment.currency)} already refunded`
          : ""
      }.`}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} disabled={saving}>
            {saving ? "Recording…" : "Record refund"}
          </Button>
        </>
      }
    >
      <Notice tone="amber" title="This does not send money back">
        It records the refund in ByteHUB and the audit log, and frees the seat on a full
        refund. Then refund the same amount in the Cashfree dashboard.
      </Notice>
      {error && (
        <p
          role="alert"
          className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      <Field
        label={`Amount (${payment.currency})`}
        htmlFor="refund-amount"
        hint={`Up to ${formatMoney(remainingMinor, payment.currency)}.`}
      >
        <input
          id="refund-amount"
          type="number"
          min={0.01}
          step="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Reason" htmlFor="refund-reason" hint="Saved in the audit log.">
        <input
          id="refund-reason"
          type="text"
          required
          placeholder="e.g. Student cancelled before the cohort started"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={inputClass}
          data-autofocus
        />
      </Field>
    </Dialog>
  );
}
