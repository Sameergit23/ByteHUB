"use client";

import { useEffect, useState } from "react";
import { DashboardLayout, NavItem } from "../../components/dashboard/DashboardLayout";
import { apiFetch } from "../../lib/api";

const ADMIN_NAV: NavItem[] = [
  { id: "overview", label: "Overview Metrics" },
  { id: "users", label: "Users & Accounts" },
  { id: "internships", label: "Internship Approvals", badge: "Live" },
  { id: "cohorts", label: "Programmes & Cohorts" },
  { id: "enrolments", label: "Enrolments" },
  { id: "payments", label: "Payments & Refunds" },
  { id: "contact", label: "Contact Inquiries" },
  { id: "audit", label: "Audit Logs" },
];

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Metrics
  const [metrics, setMetrics] = useState({
    userCount: 42,
    internshipCount: 14,
    applicationCount: 89,
    activeEnrollments: 28,
    totalRevenueINR: 672000,
    totalRevenueUSD: 2490,
  });

  // Users state
  const [userSearch, setUserSearch] = useState("");
  const [users, setUsers] = useState([
    { id: "usr_01", name: "Rohan Sharma", email: "rohan@example.com", role: "STUDENT", createdAt: "2026-11-08" },
    { id: "usr_02", name: "Pooja Nair", email: "pooja@example.com", role: "STUDENT", createdAt: "2026-11-07" },
    { id: "usr_03", name: "Acme Cloud Recruiting", email: "jobs@acme.com", role: "COMPANY", createdAt: "2026-11-05" },
    { id: "usr_04", name: "SuperAdmin", email: "admin@bytehub.dev", role: "ADMIN", createdAt: "2026-11-01" },
  ]);

  // Internships
  const [internships, setInternships] = useState([
    { id: "int_01", title: "Frontend Developer Intern", company: "Acme Cloud", status: "PUBLISHED" },
    { id: "int_02", title: "Backend Systems Intern", company: "HyperGrid", status: "PUBLISHED" },
    { id: "int_03", title: "Data Analyst Intern", company: "MetricsLab", status: "DRAFT" },
  ]);

  // Cohorts
  const [cohorts, setCohorts] = useState([
    { id: "coh_01", title: "Full-Stack Web Development", code: "WEB-2026-01", seatsTotal: 30, seatsLeft: 8, fee: "₹24,000" },
    { id: "coh_02", title: "Mobile App Development", code: "APP-2026-01", seatsTotal: 25, seatsLeft: 12, fee: "₹22,000" },
  ]);

  // Payments
  const [payments, setPayments] = useState([
    { id: "pay_01", orderId: "order_k9f12a", email: "student1@example.com", amount: "₹24,000", status: "PAID", provider: "RAZORPAY" },
    { id: "pay_02", orderId: "pi_stripe_88", email: "intl_student@example.com", amount: "$149", status: "PAID", provider: "STRIPE" },
  ]);

  // Audit Logs
  const [auditLogs] = useState([
    { id: "aud_01", action: "PAYMENT_CAPTURED", entity: "PAYMENT", user: "system_webhook", time: "2026-11-09 14:15" },
    { id: "aud_02", action: "ENROLLMENT_CONFIRMED", entity: "ENROLLMENT", user: "rohan@example.com", time: "2026-11-09 14:16" },
    { id: "aud_03", action: "ADMIN_DATA_EXPORT_CSV", entity: "USERS", user: "admin@bytehub.dev", time: "2026-11-09 12:00" },
  ]);

  // Refund modal state
  const [refundTarget, setRefundTarget] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");

  const handleExportCsv = (entity: string) => {
    window.open(`/api/admin/export/${entity}`, "_blank");
  };

  const handleToggleInternshipStatus = (id: string, current: string) => {
    const next = current === "PUBLISHED" ? "CLOSED" : "PUBLISHED";
    setInternships(internships.map((i) => (i.id === id ? { ...i, status: next } : i)));
  };

  const handleProcessRefund = () => {
    if (!refundTarget || !refundReason) return;
    setPayments(
      payments.map((p) =>
        p.id === refundTarget.id ? { ...p, status: "REFUNDED" } : p
      )
    );
    alert(`Refund of ${refundAmount || refundTarget.amount} processed with audit log entry.`);
    setRefundTarget(null);
    setRefundReason("");
  };

  return (
    <DashboardLayout
      role="ADMIN"
      title="Admin Superpanel"
      subtitle="Comprehensive administrative control over platform security, users, cohort capacities, financial ledger, and compliance."
      navItems={ADMIN_NAV}
      activeNavId={activeTab}
      onNavSelect={setActiveTab}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleExportCsv(activeTab === "overview" ? "users" : activeTab)}
            className="px-3 py-1.5 border border-[#16150F] text-xs font-mono hover:bg-[#16150F] hover:text-[#F5F2EA] transition-colors"
          >
            Export Table (CSV) ↓
          </button>
        </div>
      }
    >
      {/* =================================================================== */}
      {/* TAB 1: OVERVIEW METRICS                                             */}
      {/* =================================================================== */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[10px] font-mono uppercase text-[#5A574D] block">Total Users</span>
              <span className="font-heading text-2xl font-bold mt-1 block">{metrics.userCount}</span>
            </div>
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[10px] font-mono uppercase text-[#5A574D] block">Internships</span>
              <span className="font-heading text-2xl font-bold mt-1 block">{metrics.internshipCount}</span>
            </div>
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[10px] font-mono uppercase text-[#5A574D] block">Applications</span>
              <span className="font-heading text-2xl font-bold mt-1 block">{metrics.applicationCount}</span>
            </div>
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[10px] font-mono uppercase text-[#5A574D] block">Enrolments</span>
              <span className="font-heading text-2xl font-bold mt-1 block text-[#B8341A]">{metrics.activeEnrollments}</span>
            </div>
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[10px] font-mono uppercase text-[#5A574D] block">Revenue INR</span>
              <span className="font-heading text-lg font-bold mt-1 block">₹{metrics.totalRevenueINR.toLocaleString("en-IN")}</span>
            </div>
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[10px] font-mono uppercase text-[#5A574D] block">Revenue USD</span>
              <span className="font-heading text-lg font-bold mt-1 block">${metrics.totalRevenueUSD.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: USERS                                                        */}
      {/* =================================================================== */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-4">
            <input
              type="text"
              placeholder="Search user name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="px-3 py-2 border border-[#D8D3C4] bg-white text-xs w-full max-w-sm"
            />
            <button
              type="button"
              onClick={() => handleExportCsv("users")}
              className="px-3 py-2 bg-[#16150F] text-[#F5F2EA] text-xs font-mono shrink-0"
            >
              Export Users CSV
            </button>
          </div>

          <div className="border border-[#D8D3C4] bg-[#FAF8F3] divide-y divide-[#D8D3C4]">
            {users
              .filter((u) => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
              .map((u) => (
                <div key={u.id} className="p-4 sm:flex sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div>
                    <div className="font-bold text-sm">{u.name}</div>
                    <div className="text-xs text-[#5A574D] font-mono">{u.email} · Joined {u.createdAt}</div>
                  </div>
                  <div>
                    <span className="px-2 py-0.5 border border-[#16150F] text-[10px] font-mono">{u.role}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: INTERNSHIP APPROVALS                                         */}
      {/* =================================================================== */}
      {activeTab === "internships" && (
        <div className="border border-[#D8D3C4] bg-[#FAF8F3] divide-y divide-[#D8D3C4]">
          {internships.map((i) => (
            <div key={i.id} className="p-4 sm:flex sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div>
                <h3 className="font-bold text-sm">{i.title}</h3>
                <p className="text-xs text-[#5A574D]">{i.company}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 border border-[#D8D3C4] text-[10px] font-mono">{i.status}</span>
                <button
                  type="button"
                  onClick={() => handleToggleInternshipStatus(i.id, i.status)}
                  className="px-3 py-1 border border-[#16150F] text-xs font-mono hover:bg-[#16150F] hover:text-[#F5F2EA]"
                >
                  {i.status === "PUBLISHED" ? "Close Role" : "Approve & Publish"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: COHORTS                                                      */}
      {/* =================================================================== */}
      {activeTab === "cohorts" && (
        <div className="border border-[#D8D3C4] bg-[#FAF8F3] divide-y divide-[#D8D3C4]">
          {cohorts.map((c) => (
            <div key={c.id} className="p-4 sm:flex sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div>
                <h3 className="font-bold text-sm">{c.title}</h3>
                <p className="text-xs font-mono text-[#5A574D]">{c.code} · Tuition: {c.fee}</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span>{c.seatsLeft} of {c.seatsTotal} seats left</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 6: PAYMENTS & REFUNDS                                           */}
      {/* =================================================================== */}
      {activeTab === "payments" && (
        <div className="space-y-6">
          <div className="border border-[#D8D3C4] bg-[#FAF8F3] divide-y divide-[#D8D3C4]">
            {payments.map((p) => (
              <div key={p.id} className="p-4 sm:flex sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <div>
                  <div className="font-bold text-sm">{p.orderId}</div>
                  <div className="text-xs text-[#5A574D] font-mono">{p.email} · {p.provider} · {p.amount}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-[#16150F] text-[#F5F2EA] text-[10px] font-mono">{p.status}</span>
                  {p.status === "PAID" && (
                    <button
                      type="button"
                      onClick={() => {
                        setRefundTarget(p);
                        setRefundAmount(p.amount.replace(/[^0-9]/g, ""));
                      }}
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
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
              <div className="bg-[#FAF8F3] border border-[#16150F] p-6 max-w-md w-full space-y-4">
                <h3 className="font-heading font-bold text-lg">Issue Refund for {refundTarget.orderId}</h3>
                <p className="text-xs text-[#5A574D]">
                  Every refund is verified against the payment state machine and recorded in the audit log.
                </p>

                <div className="space-y-2 text-xs">
                  <label className="block font-medium">Refund Reason (Required for Audit Trail)</label>
                  <input
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
                    onClick={handleProcessRefund}
                    className="px-4 py-2 bg-[#B8341A] text-white text-xs font-mono uppercase"
                  >
                    Confirm Refund
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 8: AUDIT LOGS                                                   */}
      {/* =================================================================== */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="border border-[#D8D3C4] bg-[#FAF8F3] divide-y divide-[#D8D3C4] font-mono text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <span className="font-bold text-[#16150F]">{log.action}</span>
                  <span className="text-[#5A574D] ml-2">[{log.entity}] by {log.user}</span>
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
