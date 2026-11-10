"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardLayout, NavItem } from "../../components/dashboard/DashboardLayout";
import { apiFetch, ApiError, redirectToLogin } from "../../lib/api";
import { formatDate, formatDateTime, formatMoney } from "../../lib/format";

/* eslint-disable @typescript-eslint/no-explicit-any -- API payloads are mapped field by field below */

interface Metrics {
  userCount: number;
  internshipCount: number;
  applicationCount: number;
  activeEnrollments: number;
  unhandledMessages: number;
  totalRevenueINR: number;
  totalRevenueUSD: number;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface InternshipRow {
  id: string;
  title: string;
  company: string;
  status: string;
  applications: number;
}

interface CohortRow {
  id: string;
  title: string;
  code: string;
  seatsTotal: number;
  seatsLeft: number;
  fee: string;
  startDate: string;
}

interface EnrolmentRow {
  id: string;
  student: string;
  email: string;
  programme: string;
  cohortCode: string;
  status: string;
  createdAt: string;
}

interface PaymentRow {
  id: string;
  orderId: string;
  email: string;
  programme: string;
  amountMinor: number;
  refundedMinor: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
}

interface MessageRow {
  id: string;
  fullName: string;
  email: string;
  topic: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface AuditRow {
  id: string;
  action: string;
  entity: string;
  user: string;
  time: string;
}

const EXPORTABLE_TABS = new Set(["users", "payments", "enrolments"]);

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<string>("overview");

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userSearch, setUserSearch] = useState("");
  const [internships, setInternships] = useState<InternshipRow[]>([]);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [enrolments, setEnrolments] = useState<EnrolmentRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Refund modal state
  const [refundTarget, setRefundTarget] = useState<PaymentRow | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundError, setRefundError] = useState<string | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);

  const toUserRows = (items: any[]): UserRow[] =>
    items.map((u) => ({
      id: u.id,
      name: u.organizationName ? `${u.name} (${u.organizationName})` : u.name,
      email: u.email,
      role: u.role,
      createdAt: formatDate(u.createdAt),
    }));

  const loadPayments = useCallback(async () => {
    const res = await apiFetch<any>("/admin/payments?limit=50");
    setPayments(
      (res.data.items as any[]).map((p) => ({
        id: p.id,
        orderId: p.orderId,
        email: p.user?.email || "",
        programme: p.programmeTitle || "",
        amountMinor: p.amount,
        refundedMinor: p.refundedAmount || 0,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        createdAt: formatDate(p.createdAt),
      }))
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [m, u, i, c, e, msgs, logs] = await Promise.all([
        apiFetch<any>("/admin/metrics"),
        apiFetch<any>("/admin/users?limit=50"),
        apiFetch<any>("/admin/internships?limit=50"),
        apiFetch<any>("/admin/cohorts"),
        apiFetch<any>("/admin/enrolments?limit=50"),
        apiFetch<any>("/admin/contact-messages"),
        apiFetch<any>("/admin/audit-logs?limit=50"),
        loadPayments(),
      ]);

      setMetrics(m.data);
      setUsers(toUserRows(u.data.items));
      setUserTotal(u.data.meta?.total ?? u.data.items.length);

      setInternships(
        (i.data.items as any[]).map((row) => ({
          id: row.id,
          title: row.title,
          company:
            row.companyName || row.company?.organizationName || row.company?.name || "",
          status: row.status,
          applications: row._count?.applications ?? 0,
        }))
      );

      setCohorts(
        (c.data as any[]).map((row) => ({
          id: row.id,
          title: row.programme?.title || row.name,
          code: row.cohortCode,
          seatsTotal: row.seatsTotal,
          seatsLeft: row.seatsLeft,
          fee: row.priceAmount > 0 ? formatMoney(row.priceAmount, row.currency) : "Free",
          startDate: formatDate(row.startDate),
        }))
      );

      setEnrolments(
        (e.data.items as any[]).map((row) => ({
          id: row.id,
          student: row.user?.name || "",
          email: row.user?.email || "",
          programme: row.cohort?.programme?.title || "",
          cohortCode: row.cohort?.cohortCode || "",
          status: row.status,
          createdAt: formatDate(row.createdAt),
        }))
      );

      setMessages(
        (msgs.data as any[]).map((row) => ({
          id: row.id,
          fullName: row.fullName,
          email: row.email,
          topic: row.topic,
          message: row.message,
          isRead: row.isRead,
          createdAt: formatDateTime(row.createdAt),
        }))
      );

      setAuditLogs(
        (logs.data.items as any[]).map((row) => ({
          id: row.id,
          action: row.action,
          entity: row.entityType,
          user: row.user?.email || "system",
          time: formatDateTime(row.createdAt),
        }))
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        redirectToLogin();
        return;
      }
      setLoadError(
        err instanceof Error
          ? err.message
          : "The admin panel could not be loaded. Please retry."
      );
    } finally {
      setLoading(false);
    }
  }, [loadPayments]);

  useEffect(() => {
    void load();
  }, [load]);

  // Server-side user search (debounced) so it covers every account, not just the first page.
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch<any>(
          `/admin/users?limit=50&search=${encodeURIComponent(userSearch.trim())}`
        );
        setUsers(toUserRows(res.data.items));
        setUserTotal(res.data.meta?.total ?? res.data.items.length);
      } catch {
        // The previous list stays on screen; the main loader reports real outages.
      }
    }, 300);
    return () => clearTimeout(timer);
    // Deliberately keyed on the query only: this must not re-run when `loading` flips.
  }, [userSearch]);

  const handleExportCsv = (entity: string) => {
    window.open(`/api/admin/export/${entity}`, "_blank");
  };

  const handleSetInternshipStatus = async (id: string, next: string) => {
    setBusyId(id);
    setNotice(null);
    try {
      await apiFetch(`/admin/internships/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setInternships((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: next } : i))
      );
      setNotice({
        type: "success",
        text:
          next === "PUBLISHED"
            ? "Internship approved and published."
            : "Internship closed.",
      });
    } catch (err: any) {
      setNotice({
        type: "error",
        text: err?.message || "The internship could not be updated.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkMessageRead = async (id: string) => {
    setBusyId(id);
    setNotice(null);
    try {
      await apiFetch(`/admin/contact-messages/${id}/read`, {
        method: "PATCH",
        body: "{}",
      });
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isRead: true } : m)));
      setMetrics((prev) =>
        prev
          ? { ...prev, unhandledMessages: Math.max(0, prev.unhandledMessages - 1) }
          : prev
      );
    } catch (err: any) {
      setNotice({
        type: "error",
        text: err?.message || "The message could not be updated.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const openRefund = (payment: PaymentRow) => {
    setRefundTarget(payment);
    setRefundReason("");
    setRefundError(null);
    setRefundAmount(String((payment.amountMinor - payment.refundedMinor) / 100));
  };

  const handleProcessRefund = async () => {
    if (!refundTarget) return;
    setRefundError(null);

    const remainingMinor = refundTarget.amountMinor - refundTarget.refundedMinor;
    const amountMinor = Math.round(Number(refundAmount) * 100);

    if (!refundReason.trim()) {
      setRefundError("A reason is required for the audit trail.");
      return;
    }
    if (
      !Number.isFinite(amountMinor) ||
      amountMinor <= 0 ||
      amountMinor > remainingMinor
    ) {
      setRefundError(
        `Enter an amount between 1 and ${formatMoney(remainingMinor, refundTarget.currency)}.`
      );
      return;
    }

    setIsRefunding(true);
    try {
      await apiFetch("/payments/refund", {
        method: "POST",
        body: JSON.stringify({
          paymentId: refundTarget.id,
          amount: amountMinor,
          reason: refundReason.trim(),
        }),
      });
      await loadPayments();
      setNotice({
        type: "success",
        text: `Refund of ${formatMoney(amountMinor, refundTarget.currency)} recorded for ${refundTarget.orderId}. Remember to send the money back from the payment gateway dashboard.`,
      });
      setRefundTarget(null);
    } catch (err: any) {
      setRefundError(err?.message || "The refund could not be recorded.");
    } finally {
      setIsRefunding(false);
    }
  };

  const unreadMessages = messages.filter((m) => !m.isRead).length;
  const pendingApprovals = internships.filter((i) => i.status === "DRAFT").length;

  const navItems: NavItem[] = [
    { id: "overview", label: "Overview Metrics" },
    { id: "users", label: "Users & Accounts" },
    {
      id: "internships",
      label: "Internship Approvals",
      ...(pendingApprovals ? { badge: pendingApprovals } : {}),
    },
    { id: "cohorts", label: "Programmes & Cohorts" },
    { id: "enrolments", label: "Enrolments" },
    { id: "payments", label: "Payments & Refunds" },
    {
      id: "contact",
      label: "Contact Inquiries",
      ...(unreadMessages ? { badge: unreadMessages } : {}),
    },
    { id: "audit", label: "Audit Logs" },
  ];

  const ready = !loading && !loadError;
  const emptyRow = (text: string) => (
    <div className="p-6 text-sm text-[#5A574D]">{text}</div>
  );

  return (
    <DashboardLayout
      role="ADMIN"
      title="Admin Superpanel"
      subtitle="Comprehensive administrative control over platform security, users, cohort capacities, financial ledger, and compliance."
      navItems={navItems}
      activeNavId={activeTab}
      onNavSelect={setActiveTab}
      actions={
        EXPORTABLE_TABS.has(activeTab) ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExportCsv(activeTab)}
              className="px-3 py-1.5 border border-[#16150F] text-xs font-mono hover:bg-[#16150F] hover:text-[#F5F2EA] transition-colors"
            >
              Export Table (CSV) ↓
            </button>
          </div>
        ) : undefined
      }
    >
      {notice && (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          className={`mb-6 p-3 border text-xs ${
            notice.type === "error"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-green-50 border-green-200 text-green-800"
          }`}
        >
          {notice.text}
        </div>
      )}

      {loading && (
        <p className="font-mono text-xs text-[#5A574D]">Loading admin data...</p>
      )}

      {!loading && loadError && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm space-y-3"
        >
          <p>{loadError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="px-3 py-1.5 border border-red-700 text-xs font-mono"
          >
            Retry
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 1: OVERVIEW METRICS                                             */}
      {/* =================================================================== */}
      {ready && activeTab === "overview" && metrics && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[10px] font-mono uppercase text-[#5A574D] block">
                Total Users
              </span>
              <span className="font-heading text-2xl font-bold mt-1 block">
                {metrics.userCount}
              </span>
            </div>
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[10px] font-mono uppercase text-[#5A574D] block">
                Internships
              </span>
              <span className="font-heading text-2xl font-bold mt-1 block">
                {metrics.internshipCount}
              </span>
            </div>
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[10px] font-mono uppercase text-[#5A574D] block">
                Applications
              </span>
              <span className="font-heading text-2xl font-bold mt-1 block">
                {metrics.applicationCount}
              </span>
            </div>
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[10px] font-mono uppercase text-[#5A574D] block">
                Enrolments
              </span>
              <span className="font-heading text-2xl font-bold mt-1 block text-[#B8341A]">
                {metrics.activeEnrollments}
              </span>
            </div>
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[10px] font-mono uppercase text-[#5A574D] block">
                Revenue INR
              </span>
              <span className="font-heading text-lg font-bold mt-1 block">
                ₹{metrics.totalRevenueINR.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[10px] font-mono uppercase text-[#5A574D] block">
                Revenue USD
              </span>
              <span className="font-heading text-lg font-bold mt-1 block">
                ${metrics.totalRevenueUSD.toLocaleString()}
              </span>
            </div>
          </div>

          {(pendingApprovals > 0 || unreadMessages > 0) && (
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] divide-y divide-[#D8D3C4] text-sm">
              {pendingApprovals > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("internships")}
                  className="w-full p-4 text-left hover:bg-white/60"
                >
                  <strong>{pendingApprovals}</strong> internship
                  {pendingApprovals === 1 ? "" : "s"} awaiting approval →
                </button>
              )}
              {unreadMessages > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("contact")}
                  className="w-full p-4 text-left hover:bg-white/60"
                >
                  <strong>{unreadMessages}</strong> unread contact inquir
                  {unreadMessages === 1 ? "y" : "ies"} →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: USERS                                                        */}
      {/* =================================================================== */}
      {ready && activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-4">
            <input
              type="text"
              aria-label="Search users"
              placeholder="Search user name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="px-3 py-2 border border-[#D8D3C4] bg-white text-xs w-full max-w-sm"
            />
            <span className="text-xs font-mono text-[#5A574D] shrink-0">
              {users.length} of {userTotal}
            </span>
          </div>

          <div className="border border-[#D8D3C4] bg-[#FAF8F3] divide-y divide-[#D8D3C4]">
            {users.length === 0 && emptyRow("No users match this search.")}
            {users.map((u) => (
              <div
                key={u.id}
                className="p-4 sm:flex sm:items-center sm:justify-between space-y-2 sm:space-y-0"
              >
                <div>
                  <div className="font-bold text-sm">{u.name}</div>
                  <div className="text-xs text-[#5A574D] font-mono">
                    {u.email} · Joined {u.createdAt}
                  </div>
                </div>
                <div>
                  <span className="px-2 py-0.5 border border-[#16150F] text-[10px] font-mono">
                    {u.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: INTERNSHIP APPROVALS                                         */}
      {/* =================================================================== */}
      {ready && activeTab === "internships" && (
        <div className="border border-[#D8D3C4] bg-[#FAF8F3] divide-y divide-[#D8D3C4]">
          {internships.length === 0 && emptyRow("No internships have been posted yet.")}
          {internships.map((i) => (
            <div
              key={i.id}
              className="p-4 sm:flex sm:items-center sm:justify-between space-y-2 sm:space-y-0"
            >
              <div>
                <h3 className="font-bold text-sm">{i.title}</h3>
                <p className="text-xs text-[#5A574D]">
                  {i.company} · {i.applications} application
                  {i.applications === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-0.5 border text-[10px] font-mono ${
                    i.status === "DRAFT"
                      ? "border-[#B8341A] text-[#B8341A] font-bold"
                      : "border-[#D8D3C4]"
                  }`}
                >
                  {i.status === "DRAFT" ? "AWAITING APPROVAL" : i.status}
                </span>
                <button
                  type="button"
                  disabled={busyId === i.id}
                  onClick={() =>
                    handleSetInternshipStatus(
                      i.id,
                      i.status === "PUBLISHED" ? "CLOSED" : "PUBLISHED"
                    )
                  }
                  className="px-3 py-1 border border-[#16150F] text-xs font-mono hover:bg-[#16150F] hover:text-[#F5F2EA] disabled:opacity-50"
                >
                  {i.status === "PUBLISHED"
                    ? "Close Role"
                    : i.status === "CLOSED"
                      ? "Reopen"
                      : "Approve & Publish"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: COHORTS                                                      */}
      {/* =================================================================== */}
      {ready && activeTab === "cohorts" && (
        <div className="border border-[#D8D3C4] bg-[#FAF8F3] divide-y divide-[#D8D3C4]">
          {cohorts.length === 0 && emptyRow("No cohorts have been scheduled yet.")}
          {cohorts.map((c) => (
            <div
              key={c.id}
              className="p-4 sm:flex sm:items-center sm:justify-between space-y-2 sm:space-y-0"
            >
              <div>
                <h3 className="font-bold text-sm">{c.title}</h3>
                <p className="text-xs font-mono text-[#5A574D]">
                  {c.code} · Tuition: {c.fee} · Starts {c.startDate}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span>
                  {c.seatsLeft} of {c.seatsTotal} seats left
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 5: ENROLMENTS                                                   */}
      {/* =================================================================== */}
      {ready && activeTab === "enrolments" && (
        <div className="border border-[#D8D3C4] bg-[#FAF8F3] divide-y divide-[#D8D3C4]">
          {enrolments.length === 0 && emptyRow("No enrolments yet.")}
          {enrolments.map((e) => (
            <div
              key={e.id}
              className="p-4 sm:flex sm:items-center sm:justify-between space-y-2 sm:space-y-0"
            >
              <div>
                <div className="font-bold text-sm">{e.student}</div>
                <div className="text-xs text-[#5A574D] font-mono">
                  {e.email} · {e.programme} · {e.cohortCode} · {e.createdAt}
                </div>
              </div>
              <span className="px-2 py-0.5 border border-[#16150F] text-[10px] font-mono">
                {e.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 6: PAYMENTS & REFUNDS                                           */}
      {/* =================================================================== */}
      {ready && activeTab === "payments" && (
        <div className="space-y-6">
          <div className="border border-[#D8D3C4] bg-[#FAF8F3] divide-y divide-[#D8D3C4]">
            {payments.length === 0 && emptyRow("No payments have been made yet.")}
            {payments.map((p) => (
              <div
                key={p.id}
                className="p-4 sm:flex sm:items-center sm:justify-between space-y-2 sm:space-y-0"
              >
                <div>
                  <div className="font-bold text-sm">{p.orderId}</div>
                  <div className="text-xs text-[#5A574D] font-mono">
                    {p.email} · {p.provider} · {formatMoney(p.amountMinor, p.currency)} ·{" "}
                    {p.createdAt}
                    {p.refundedMinor > 0 &&
                      ` · refunded ${formatMoney(p.refundedMinor, p.currency)}`}
                  </div>
                  {p.programme && (
                    <div className="text-xs text-[#5A574D]">{p.programme}</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-[#16150F] text-[#F5F2EA] text-[10px] font-mono">
                    {p.status.replace("_", " ")}
                  </span>
                  {(p.status === "PAID" || p.status === "PARTIALLY_REFUNDED") && (
                    <button
                      type="button"
                      onClick={() => openRefund(p)}
                      className="px-3 py-1 border border-[#B8341A] text-[#B8341A] text-xs font-mono hover:bg-[#B8341A] hover:text-white"
                    >
                      Issue Refund
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Refund Modal */}
          {refundTarget && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="refund-title"
              className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            >
              <div className="bg-[#FAF8F3] border border-[#16150F] p-6 max-w-md w-full space-y-4">
                <h3 id="refund-title" className="font-heading font-bold text-lg">
                  Issue Refund for {refundTarget.orderId}
                </h3>
                <p className="text-xs text-[#5A574D]">
                  This records the refund in the ByteHUB ledger and audit log, and
                  releases the seat on a full refund.{" "}
                  <strong className="text-[#B8341A]">
                    It does not move money yet — also issue the refund in the payment
                    gateway dashboard.
                  </strong>
                </p>

                {refundError && (
                  <div
                    role="alert"
                    className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs"
                  >
                    {refundError}
                  </div>
                )}

                <div className="space-y-2 text-xs">
                  <label htmlFor="refund-amount" className="block font-medium">
                    Refund Amount ({refundTarget.currency}) — up to{" "}
                    {formatMoney(
                      refundTarget.amountMinor - refundTarget.refundedMinor,
                      refundTarget.currency
                    )}
                  </label>
                  <input
                    id="refund-amount"
                    type="number"
                    min={1}
                    step="0.01"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8D3C4] bg-white text-sm"
                  />
                </div>

                <div className="space-y-2 text-xs">
                  <label htmlFor="refund-reason" className="block font-medium">
                    Refund Reason (Required for Audit Trail)
                  </label>
                  <input
                    id="refund-reason"
                    type="text"
                    required
                    placeholder="e.g. Student requested cancellation prior to cohort start"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full px-3 py-2 border border-[#D8D3C4] bg-white text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRefundTarget(null)}
                    className="px-4 py-2 border border-[#D8D3C4] text-xs font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isRefunding}
                    onClick={handleProcessRefund}
                    className="px-4 py-2 bg-[#B8341A] text-white text-xs font-mono uppercase disabled:opacity-50"
                  >
                    {isRefunding ? "Recording..." : "Confirm Refund"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 7: CONTACT INQUIRIES                                            */}
      {/* =================================================================== */}
      {ready && activeTab === "contact" && (
        <div className="border border-[#D8D3C4] bg-[#FAF8F3] divide-y divide-[#D8D3C4]">
          {messages.length === 0 && emptyRow("No contact inquiries yet.")}
          {messages.map((m) => (
            <div key={m.id} className="p-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-sm">
                    {m.topic}
                    {!m.isRead && (
                      <span className="ml-2 px-1.5 py-0.5 bg-[#B8341A] text-white text-[10px] font-mono">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#5A574D] font-mono">
                    {m.fullName} · {m.email} · {m.createdAt}
                  </div>
                </div>
                {!m.isRead && (
                  <button
                    type="button"
                    disabled={busyId === m.id}
                    onClick={() => handleMarkMessageRead(m.id)}
                    className="self-start sm:self-auto px-3 py-1 border border-[#16150F] text-xs font-mono hover:bg-[#16150F] hover:text-[#F5F2EA] disabled:opacity-50"
                  >
                    Mark as handled
                  </button>
                )}
              </div>
              <p className="text-sm text-[#16150F] whitespace-pre-wrap">{m.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 8: AUDIT LOGS                                                   */}
      {/* =================================================================== */}
      {ready && activeTab === "audit" && (
        <div className="space-y-4">
          <div className="border border-[#D8D3C4] bg-[#FAF8F3] divide-y divide-[#D8D3C4] font-mono text-xs">
            {auditLogs.length === 0 && emptyRow("No audit entries yet.")}
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
              >
                <div>
                  <span className="font-bold text-[#16150F]">{log.action}</span>
                  <span className="text-[#5A574D] ml-2">
                    [{log.entity}] by {log.user}
                  </span>
                </div>
                <div className="text-[11px] text-[#5A574D]">{log.time}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
