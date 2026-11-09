"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout, NavItem } from "../../../components/dashboard/DashboardLayout";
import { getStoredUser, apiFetch } from "../../../lib/api";

const STUDENT_NAV: NavItem[] = [
  { id: "overview", label: "Overview" },
  { id: "applications", label: "My Applications", badge: 2 },
  { id: "training", label: "My Training & Progress", badge: 1 },
  { id: "payments", label: "Payments & Receipts" },
  { id: "certificates", label: "Certificates" },
  { id: "profile", label: "Profile & Settings" },
];

export default function StudentDashboardPage() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [user, setUser] = useState<any>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  // Applications mock data
  const [applications, setApplications] = useState([
    {
      id: "app-819",
      role: "Frontend Developer Intern",
      company: "Acme Cloud Technologies",
      stipend: "₹35,000 / mo",
      appliedDate: "2026-11-08",
      status: "UNDER_REVIEW",
    },
    {
      id: "app-812",
      role: "Full-Stack TypeScript Engineer",
      company: "KiteMetrics HQ",
      stipend: "₹40,000 / mo",
      appliedDate: "2026-11-04",
      status: "SHORTLISTED",
    },
  ]);

  // Enrolled Training Programs
  const enrolledTrack = {
    id: "cohort-web-01",
    programmeTitle: "Full-Stack Web Development",
    cohortCode: "WEB-2026-COHORT-01",
    mode: "[REMOTE / ON-SITE]",
    progressPercent: 35,
    currentWeek: "Week 03: Next.js App Router & Server Components",
    status: "ACTIVE",
    weeks: [
      { week: 1, title: "Modern HTML & Semantic Layouts", status: "COMPLETED" },
      { week: 2, title: "TypeScript & React Architecture", status: "COMPLETED" },
      { week: 3, title: "Next.js App Router & Server Components", status: "IN_PROGRESS" },
      { week: 4, title: "Database Integration & Full Deployment", status: "UPCOMING" },
    ],
  };

  // Payments & Receipts
  const payments = [
    {
      id: "pay_rzp_mock_001",
      orderId: "order_k9f12a_001",
      programmeTitle: "Full-Stack Web Development",
      amount: "₹24,000",
      provider: "RAZORPAY",
      date: "2026-11-09",
      status: "PAID",
    },
  ];

  // Certificates
  const certificates = [
    {
      id: "cert_web_001",
      code: "BYTE-2026-FSW-8192",
      title: "Full-Stack Web Development Mastery",
      issuedAt: "2026-11-09",
      verificationUrl: "/verify/BYTE-2026-FSW-8192",
    },
  ];

  const handleWithdraw = (appId: string) => {
    if (confirm("Are you sure you want to withdraw this application?")) {
      setApplications(applications.filter((a) => a.id !== appId));
    }
  };

  const handleDataExport = () => {
    window.open("/api/auth/me/export", "_blank");
  };

  const handleDeleteAccount = async () => {
    if (
      confirm(
        "CAUTION: This will anonymize and purge all your personal records. Do you wish to continue?"
      )
    ) {
      await apiFetch("/auth/me", { method: "DELETE" }).catch(() => {});
      window.location.href = "/auth?mode=login";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return <span className="inline-block px-2 py-0.5 border border-[#D8D3C4] text-[11px] font-mono text-[#5A574D]">SUBMITTED</span>;
      case "UNDER_REVIEW":
        return <span className="inline-block px-2 py-0.5 border border-[#16150F] text-[11px] font-mono text-[#16150F] font-bold">UNDER REVIEW</span>;
      case "SHORTLISTED":
        return <span className="inline-block px-2 py-0.5 border border-[#B8341A] text-[11px] font-mono text-[#B8341A] font-bold">★ SHORTLISTED</span>;
      case "ACCEPTED":
        return <span className="inline-block px-2 py-0.5 bg-[#16150F] text-[#F5F2EA] text-[11px] font-mono font-bold">ACCEPTED</span>;
      case "REJECTED":
        return <span className="inline-block px-2 py-0.5 border border-[#D8D3C4] text-[11px] font-mono text-[#5A574D] line-through">REJECTED</span>;
      default:
        return <span className="inline-block px-2 py-0.5 border border-[#D8D3C4] text-[11px] font-mono">{status}</span>;
    }
  };

  return (
    <DashboardLayout
      role="STUDENT"
      title="Student Overview"
      subtitle="Track your internship pipeline, weekly training curriculum, and official certificates."
      navItems={STUDENT_NAV}
      activeNavId={activeTab}
      onNavSelect={setActiveTab}
      actions={
        <Link
          href="/internships"
          className="px-4 py-2 bg-[#B8341A] text-white text-xs font-medium uppercase tracking-wider hover:bg-[#962B15] transition-colors"
        >
          Browse Internships →
        </Link>
      }
    >
      {/* =================================================================== */}
      {/* TAB 1: OVERVIEW                                                     */}
      {/* =================================================================== */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* KPI Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[11px] font-mono uppercase text-[#5A574D] block">
                Active Applications
              </span>
              <span className="font-heading text-2xl font-bold mt-1 block">
                {applications.length}
              </span>
            </div>
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[11px] font-mono uppercase text-[#5A574D] block">
                Enrolled Cohorts
              </span>
              <span className="font-heading text-2xl font-bold mt-1 block">1</span>
            </div>
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[11px] font-mono uppercase text-[#5A574D] block">
                Current Progress
              </span>
              <span className="font-heading text-2xl font-bold mt-1 block text-[#B8341A]">
                {enrolledTrack.progressPercent}%
              </span>
            </div>
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[11px] font-mono uppercase text-[#5A574D] block">
                Certificates
              </span>
              <span className="font-heading text-2xl font-bold mt-1 block">
                {certificates.length}
              </span>
            </div>
          </div>

          {/* Active Training Banner */}
          <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-mono uppercase text-[#B8341A] font-semibold">
                  Active Training Track
                </span>
                <h2 className="font-heading text-xl font-bold mt-0.5">
                  {enrolledTrack.programmeTitle}
                </h2>
                <p className="text-xs text-[#5A574D] mt-0.5">
                  {enrolledTrack.cohortCode} · {enrolledTrack.mode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("training")}
                className="self-start sm:self-auto px-3 py-1.5 border border-[#16150F] text-xs font-medium hover:bg-[#16150F] hover:text-[#F5F2EA] transition-colors"
              >
                View Syllabus & Progress →
              </button>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5 text-[#5A574D]">
                <span>{enrolledTrack.currentWeek}</span>
                <span>{enrolledTrack.progressPercent}% Completed</span>
              </div>
              <div className="w-full bg-[#EAE6D9] h-2">
                <div
                  className="bg-[#B8341A] h-2 transition-all duration-500"
                  style={{ width: `${enrolledTrack.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Recent Applications Stacked Table */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-heading text-lg font-bold">Recent Applications</h2>
              <button
                type="button"
                onClick={() => setActiveTab("applications")}
                className="text-xs text-[#B8341A] font-mono hover:underline"
              >
                View all ({applications.length}) →
              </button>
            </div>

            <div className="border border-[#D8D3C4] bg-[#FAF8F3]">
              {/* Desktop Table Header */}
              <div className="hidden sm:grid grid-cols-12 px-4 py-2.5 border-b border-[#D8D3C4] text-[11px] font-mono uppercase text-[#5A574D]">
                <div className="col-span-5">Role & Company</div>
                <div className="col-span-3">Stipend</div>
                <div className="col-span-2">Applied Date</div>
                <div className="col-span-2 text-right">Status</div>
              </div>

              {/* Rows (Card-stack on mobile < 640px) */}
              <div className="divide-y divide-[#D8D3C4]">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 sm:grid sm:grid-cols-12 sm:px-4 sm:py-3.5 sm:items-center space-y-2 sm:space-y-0"
                  >
                    <div className="sm:col-span-5">
                      <div className="font-bold text-sm text-[#16150F]">{app.role}</div>
                      <div className="text-xs text-[#5A574D]">{app.company}</div>
                    </div>
                    <div className="sm:col-span-3 text-xs font-mono">{app.stipend}</div>
                    <div className="sm:col-span-2 text-xs font-mono text-[#5A574D]">
                      {app.appliedDate}
                    </div>
                    <div className="sm:col-span-2 sm:text-right flex items-center justify-between sm:justify-end">
                      <span className="sm:hidden text-xs text-[#5A574D]">Status:</span>
                      {getStatusBadge(app.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: MY APPLICATIONS                                              */}
      {/* =================================================================== */}
      {activeTab === "applications" && (
        <div className="space-y-6">
          <div className="border border-[#D8D3C4] bg-[#FAF8F3]">
            <div className="divide-y divide-[#D8D3C4]">
              {applications.map((app) => (
                <div key={app.id} className="p-4 sm:p-6 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-heading font-bold text-base text-[#16150F]">
                        {app.role}
                      </h3>
                      <p className="text-xs text-[#5A574D]">
                        {app.company} · Applied on {app.appliedDate} · Stipend: {app.stipend}
                      </p>
                    </div>
                    <div>{getStatusBadge(app.status)}</div>
                  </div>

                  <div className="pt-2 flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => handleWithdraw(app.id)}
                      className="text-[#5A574D] hover:text-[#B8341A] font-mono underline"
                    >
                      Withdraw application
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: TRAINING & PROGRESS                                          */}
      {/* =================================================================== */}
      {activeTab === "training" && (
        <div className="space-y-6">
          <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-6 space-y-4">
            <h2 className="font-heading text-xl font-bold">{enrolledTrack.programmeTitle}</h2>
            <p className="text-xs text-[#5A574D]">
              Cohort Code: {enrolledTrack.cohortCode} · Status: {enrolledTrack.status}
            </p>

            <div className="space-y-3 pt-4">
              <h3 className="font-mono text-xs uppercase tracking-wider font-semibold text-[#5A574D]">
                Syllabus Weeks
              </h3>
              <div className="border border-[#D8D3C4] divide-y divide-[#D8D3C4]">
                {enrolledTrack.weeks.map((w) => (
                  <div key={w.week} className="p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[#5A574D]">Week 0{w.week}</span>
                      <span className="font-medium text-[#16150F]">{w.title}</span>
                    </div>
                    <span
                      className={`font-mono text-[11px] px-2 py-0.5 border ${
                        w.status === "COMPLETED"
                          ? "bg-[#16150F] text-[#F5F2EA] border-[#16150F]"
                          : w.status === "IN_PROGRESS"
                          ? "border-[#B8341A] text-[#B8341A] font-bold"
                          : "border-[#D8D3C4] text-[#5A574D]"
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: PAYMENTS & RECEIPTS                                          */}
      {/* =================================================================== */}
      {activeTab === "payments" && (
        <div className="space-y-6">
          <div className="border border-[#D8D3C4] bg-[#FAF8F3] divide-y divide-[#D8D3C4]">
            {payments.map((p) => (
              <div
                key={p.id}
                className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="font-bold text-sm">{p.programmeTitle}</div>
                  <div className="text-xs text-[#5A574D] font-mono">
                    Order ID: {p.orderId} · Gateway: {p.provider} · Date: {p.date}
                  </div>
                  <div className="text-xs font-mono font-bold text-[#B8341A]">{p.amount}</div>
                </div>
                <button
                  type="button"
                  onClick={() => window.open(`/api/payments/${p.orderId}/invoice`, "_blank")}
                  className="self-start sm:self-auto px-4 py-2 border border-[#16150F] text-xs font-mono hover:bg-[#16150F] hover:text-[#F5F2EA] transition-colors"
                >
                  Download PDF Receipt
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 5: CERTIFICATES                                                 */}
      {/* =================================================================== */}
      {activeTab === "certificates" && (
        <div className="space-y-6">
          <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-6 space-y-4">
            <h2 className="font-heading text-lg font-bold">Issued Certificates</h2>
            <div className="border border-[#D8D3C4] divide-y divide-[#D8D3C4]">
              {certificates.map((c) => (
                <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-sm">{c.title}</h3>
                    <p className="text-xs text-[#5A574D] font-mono mt-0.5">
                      Code: {c.code} · Issued: {c.issuedAt}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert(`Verification URL: ${c.verificationUrl}`)}
                    className="px-3 py-1.5 border border-[#16150F] text-xs font-mono hover:bg-[#16150F] hover:text-white"
                  >
                    View Credential
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 6: PROFILE & PRIVACY (GDPR / DPDP)                              */}
      {/* =================================================================== */}
      {activeTab === "profile" && (
        <div className="space-y-8 max-w-2xl">
          <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-6 space-y-4">
            <h2 className="font-heading text-lg font-bold">Student Profile Details</h2>
            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-[#5A574D] block">Full Name:</span>
                <span className="font-bold text-sm text-[#16150F]">{user?.name || "Student"}</span>
              </div>
              <div>
                <span className="text-[#5A574D] block">Email Address:</span>
                <span className="font-bold text-[#16150F]">{user?.email || ""}</span>
              </div>
              <div>
                <span className="text-[#5A574D] block">Role:</span>
                <span className="font-bold text-[#B8341A]">{user?.role || "STUDENT"}</span>
              </div>
            </div>
          </div>

          {/* Privacy & Data Protection Actions */}
          <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-6 space-y-4">
            <h2 className="font-heading text-lg font-bold text-[#B8341A]">
              Privacy & Data Protection (GDPR / DPDP)
            </h2>
            <p className="text-xs text-[#5A574D]">
              Under GDPR and India&apos;s DPDP regulations, you can download a complete machine-readable
              copy of all your profile, application, and transaction data, or permanently delete your account.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                type="button"
                onClick={handleDataExport}
                className="px-4 py-2 border border-[#16150F] text-xs font-medium hover:bg-[#16150F] hover:text-[#F5F2EA] transition-colors"
              >
                Export My Data (JSON)
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-4 py-2 border border-red-600 text-red-600 text-xs font-medium hover:bg-red-600 hover:text-white transition-colors"
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
