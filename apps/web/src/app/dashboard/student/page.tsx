"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardLayout, NavItem } from "../../../components/dashboard/DashboardLayout";
import { apiFetch, ApiError, clearAuth, redirectToLogin } from "../../../lib/api";
import {
  FormAlert,
  describeError,
  makeAlert,
  successAlert,
  type AlertInfo,
} from "../../../components/ui/FormAlert";
import { payInternshipFee } from "../../../lib/cashfree";
import { PageLoader } from "../../../components/ui/Loader";
import { formatDate, formatMoney, formatStipend } from "../../../lib/format";

/* eslint-disable @typescript-eslint/no-explicit-any -- API payloads are mapped field by field below */

interface ApplicationRow {
  id: string;
  role: string;
  company: string;
  stipend: string;
  appliedDate: string;
  status: string;
  feedbackNote: string | null;
  /** Registration fee for the internship, in paise (0 = free to apply). */
  feeAmount: number;
  /** What happened to the fee the student paid: PAID, REFUNDED, PARTIALLY_REFUNDED. */
  feeStatus: string | null;
  feePaidAmount: number;
}

interface EnrollmentRow {
  id: string;
  status: string;
  cohortId: string;
  programmeTitle: string;
  programmeSlug: string;
  cohortCode: string;
  mode: string;
  startDate: string;
  durationWeeks: number;
  progressPercent: number;
  currentWeek: number;
  weeks: {
    week: number;
    title: string;
    status: "COMPLETED" | "IN_PROGRESS" | "UPCOMING";
  }[];
  certificate: { id: string; code: string; title: string; issuedAt: string } | null;
}

interface PaymentRow {
  id: string;
  orderId: string;
  programmeTitle: string;
  amount: string;
  provider: string;
  date: string;
  status: string;
}

interface Profile {
  name: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
}

const CLOSED_APPLICATION_STATES = new Set(["WITHDRAWN", "REJECTED"]);
const WITHDRAWABLE_STATES = new Set(["SUBMITTED", "UNDER_REVIEW", "INTERVIEW"]);

function toEnrollmentRow(e: any): EnrollmentRow {
  const syllabus: any[] = Array.isArray(e.programme?.syllabus)
    ? e.programme.syllabus
    : [];
  const isComplete = e.status === "COMPLETED";

  return {
    id: e.id,
    status: e.status,
    cohortId: e.cohort.id,
    programmeTitle: e.programme.title,
    programmeSlug: e.programme.slug,
    cohortCode: e.cohort.cohortCode,
    mode: e.cohort.mode,
    startDate: formatDate(e.cohort.startDate),
    durationWeeks: e.cohort.durationWeeks,
    progressPercent: e.progressPercent ?? 0,
    currentWeek: e.currentWeek ?? 0,
    weeks: syllabus.map((w, index) => {
      const week = Number(w.week) || index + 1;
      const status =
        isComplete || (e.currentWeek > 0 && week < e.currentWeek)
          ? "COMPLETED"
          : week === e.currentWeek
            ? "IN_PROGRESS"
            : "UPCOMING";
      return { week, title: String(w.title || `Week ${week}`), status };
    }),
    certificate:
      e.certificate && !e.certificate.revokedAt
        ? {
            id: e.certificate.id,
            code: e.certificate.certificateCode,
            title: e.certificate.title,
            issuedAt: formatDate(e.certificate.issuedAt),
          }
        : null,
  };
}

export default function StudentDashboardPage() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<AlertInfo | null>(null);
  const [notice, setNotice] = useState<AlertInfo | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [me, apps, enr, pays] = await Promise.all([
        apiFetch<any>("/auth/me"),
        apiFetch<any>("/applications/my"),
        apiFetch<any>("/training/my/enrollments"),
        apiFetch<any>("/payments/my"),
      ]);

      setProfile({
        name: me.data.name,
        email: me.data.email,
        role: me.data.role,
        isEmailVerified: !!me.data.isEmailVerified,
      });

      setApplications(
        (apps.data as any[]).map((a) => ({
          id: a.id,
          role: a.internship?.title || "Internship",
          company: a.internship?.companyName || "",
          stipend: formatStipend(
            a.internship?.stipendAmount ?? 0,
            a.internship?.currency
          ),
          appliedDate: formatDate(a.createdAt),
          status: a.status,
          feedbackNote: a.feedbackNote || null,
          feeAmount: a.internship?.registrationFeeAmount ?? 0,
          feeStatus: a.payments?.[0]?.status ?? null,
          feePaidAmount: a.payments?.[0]?.amount ?? 0,
        }))
      );

      setEnrollments((enr.data as any[]).map(toEnrollmentRow));

      setPayments(
        (pays.data as any[]).map((p) => ({
          id: p.id,
          orderId: p.orderId,
          programmeTitle: p.programmeTitle,
          amount: formatMoney(p.amount, p.currency),
          provider: p.provider,
          date: formatDate(p.createdAt),
          status: p.status,
        }))
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        redirectToLogin();
        return;
      }
      setLoadError(
        describeError(err, "Your dashboard could not be loaded. Please retry.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeEnrollments = useMemo(
    () => enrollments.filter((e) => e.status === "ACTIVE" || e.status === "COMPLETED"),
    [enrollments]
  );
  const pendingEnrollments = useMemo(
    () => enrollments.filter((e) => e.status === "PENDING"),
    [enrollments]
  );
  const certificates = useMemo(
    () => enrollments.filter((e) => e.certificate).map((e) => e.certificate!),
    [enrollments]
  );
  const openApplications = applications.filter(
    (a) => !CLOSED_APPLICATION_STATES.has(a.status)
  );
  const unpaidApplications = applications.filter((a) => a.status === "PENDING_PAYMENT");
  const currentTrack = activeEnrollments[0] || null;

  const navItems: NavItem[] = [
    { id: "overview", label: "Overview" },
    {
      id: "applications",
      label: "My Applications",
      ...(openApplications.length ? { badge: openApplications.length } : {}),
    },
    {
      id: "training",
      label: "My Training & Progress",
      ...(activeEnrollments.length ? { badge: activeEnrollments.length } : {}),
    },
    { id: "payments", label: "Payments & Receipts" },
    { id: "certificates", label: "Certificates" },
    { id: "profile", label: "Profile & Settings" },
  ];

  const handlePayFee = async (appId: string) => {
    setBusyId(appId);
    setNotice(null);
    try {
      const result = await payInternshipFee(appId);
      if (result.outcome === "paid") {
        setNotice(
          successAlert(
            "Payment received. Your application is now with our team and a receipt is on its way to your email."
          )
        );
        await load();
      } else if (result.outcome === "no_fee_needed") {
        setNotice(
          successAlert(
            "This internship no longer has a fee, so your application was sent."
          )
        );
        await load();
      } else {
        setNotice(
          makeAlert(
            "payment",
            "Payment not completed",
            `${result.reason ? `${result.reason}. ` : ""}No money was taken. You can try again any time before the deadline.`
          )
        );
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        redirectToLogin();
        return;
      }
      setNotice(
        describeError(err, "The payment could not be started. Please try again.")
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleWithdraw = async (appId: string) => {
    const app = applications.find((a) => a.id === appId);
    const paidFee = app?.feeStatus === "PAID";
    if (
      !confirm(
        paidFee
          ? "Are you sure you want to withdraw this application? The registration fee is not refunded automatically when you withdraw; contact us if you want to request a refund."
          : "Are you sure you want to withdraw this application?"
      )
    )
      return;
    setBusyId(appId);
    setNotice(null);
    try {
      await apiFetch(`/applications/${appId}/withdraw`, { method: "POST", body: "{}" });
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: "WITHDRAWN" } : a))
      );
      setNotice(successAlert("Application withdrawn."));
    } catch (err: any) {
      setNotice(describeError(err, "The application could not be withdrawn."));
    } finally {
      setBusyId(null);
    }
  };

  const handleResendVerification = async () => {
    if (!profile) return;
    setNotice(null);
    try {
      await apiFetch("/auth/verify-email/request", {
        method: "POST",
        body: JSON.stringify({ email: profile.email }),
      });
      setNotice(
        successAlert(`A verification link has been emailed to ${profile.email}.`)
      );
    } catch (err: any) {
      setNotice(describeError(err, "The verification email could not be sent."));
    }
  };

  const handleDataExport = () => {
    window.open("/api/auth/me/export", "_blank");
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "CAUTION: This will anonymize and purge all your personal records. This cannot be undone. Do you wish to continue?"
      )
    ) {
      return;
    }
    setNotice(null);
    try {
      await apiFetch("/auth/me", { method: "DELETE" });
      clearAuth();
      window.location.href = "/auth?mode=login";
    } catch (err: any) {
      setNotice(
        describeError(err, "Your account could not be deleted. Please try again.")
      );
    }
  };

  const handleCopyCredential = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setNotice(successAlert(`Credential code ${code} copied to clipboard.`));
    } catch {
      setNotice(successAlert(`Credential code: ${code}`));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_PAYMENT":
        return (
          <span className="inline-block px-2 py-0.5 border border-[#B8341A] text-[11px] font-mono text-[#B8341A] font-bold">
            AWAITING PAYMENT
          </span>
        );
      case "SUBMITTED":
        return (
          <span className="inline-block px-2 py-0.5 border border-[#D8D3C4] text-[11px] font-mono text-[#5A574D]">
            SUBMITTED
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-block px-2 py-0.5 border border-[#16150F] text-[11px] font-mono text-[#16150F] font-bold">
            UNDER REVIEW
          </span>
        );
      case "INTERVIEW":
        return (
          <span className="inline-block px-2 py-0.5 border border-[#B8341A] text-[11px] font-mono text-[#B8341A] font-bold">
            ★ INTERVIEW
          </span>
        );
      case "OFFERED":
        return (
          <span className="inline-block px-2 py-0.5 bg-[#16150F] text-[#F5F2EA] text-[11px] font-mono font-bold">
            OFFERED
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-block px-2 py-0.5 border border-[#D8D3C4] text-[11px] font-mono text-[#5A574D] line-through">
            REJECTED
          </span>
        );
      case "WITHDRAWN":
        return (
          <span className="inline-block px-2 py-0.5 border border-[#D8D3C4] text-[11px] font-mono text-[#5A574D]">
            WITHDRAWN
          </span>
        );
      default:
        return (
          <span className="inline-block px-2 py-0.5 border border-[#D8D3C4] text-[11px] font-mono">
            {status}
          </span>
        );
    }
  };

  const emptyState = (text: string, href?: string, cta?: string) => (
    <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-6 text-sm text-[#5A574D]">
      {text}
      {href && cta && (
        <>
          {" "}
          <Link
            href={href}
            className="text-[#B8341A] font-medium underline underline-offset-4"
          >
            {cta}
          </Link>
        </>
      )}
    </div>
  );

  return (
    <DashboardLayout
      role="STUDENT"
      title="Student Overview"
      subtitle="Track your internship pipeline, weekly training curriculum, and official certificates."
      navItems={navItems}
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
      <FormAlert alert={notice} onDismiss={() => setNotice(null)} className="mb-6" />

      {loading && <PageLoader label="Loading your dashboard…" />}

      {!loading && <FormAlert alert={loadError} onRetry={() => void load()} />}

      {!loading && !loadError && profile && !profile.isEmailVerified && (
        <div className="mb-6 p-3 border border-[#D8D3C4] bg-[#FAF8F3] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span>
            Your email address is not verified yet. Check your inbox for the link we sent
            to <strong>{profile.email}</strong>.
          </span>
          <button
            type="button"
            onClick={handleResendVerification}
            className="self-start sm:self-auto px-3 py-1.5 border border-[#16150F] font-mono hover:bg-[#16150F] hover:text-[#F5F2EA] transition-colors"
          >
            Resend link
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 1: OVERVIEW                                                     */}
      {/* =================================================================== */}
      {!loading && !loadError && activeTab === "overview" && (
        <div className="space-y-8">
          {/* KPI Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[11px] font-mono uppercase text-[#5A574D] block">
                Active Applications
              </span>
              <span className="font-heading text-2xl font-bold mt-1 block">
                {openApplications.length}
              </span>
            </div>
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[11px] font-mono uppercase text-[#5A574D] block">
                Enrolled Cohorts
              </span>
              <span className="font-heading text-2xl font-bold mt-1 block">
                {activeEnrollments.length}
              </span>
            </div>
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[11px] font-mono uppercase text-[#5A574D] block">
                Cohort Progress
              </span>
              <span className="font-heading text-2xl font-bold mt-1 block text-[#B8341A]">
                {currentTrack ? `${currentTrack.progressPercent}%` : "—"}
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

          {/* Seats that are held but not paid for yet */}
          {pendingEnrollments.map((e) => (
            <div
              key={e.id}
              className="border border-[#B8341A] bg-[#FAF8F3] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
            >
              <span>
                Your seat in <strong>{e.programmeTitle}</strong> is on hold until payment
                is completed.
              </span>
              <Link
                href={`/training/checkout/${e.cohortId}`}
                className="self-start sm:self-auto px-3 py-1.5 bg-[#B8341A] text-white text-xs font-medium uppercase tracking-wider"
              >
                Complete payment →
              </Link>
            </div>
          ))}

          {/* Active Training Banner */}
          {currentTrack ? (
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-mono uppercase text-[#B8341A] font-semibold">
                    Active Training Track
                  </span>
                  <h2 className="font-heading text-xl font-bold mt-0.5">
                    {currentTrack.programmeTitle}
                  </h2>
                  <p className="text-xs text-[#5A574D] mt-0.5">
                    {currentTrack.cohortCode} · {currentTrack.mode}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 self-start sm:self-auto">
                  <Link
                    href={`/dashboard/student/offer-letter/${currentTrack.id}`}
                    className="px-3 py-1.5 border border-[#B8341A] text-[#B8341A] text-xs font-medium hover:bg-[#B8341A] hover:text-white transition-colors"
                  >
                    Offer Letter
                  </Link>
                  <button
                    type="button"
                    onClick={() => setActiveTab("training")}
                    className="px-3 py-1.5 border border-[#16150F] text-xs font-medium hover:bg-[#16150F] hover:text-[#F5F2EA] transition-colors"
                  >
                    View Syllabus & Progress →
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5 text-[#5A574D]">
                  <span>
                    {currentTrack.currentWeek === 0
                      ? `Starts ${currentTrack.startDate}`
                      : `Week ${currentTrack.currentWeek} of ${currentTrack.durationWeeks}`}
                  </span>
                  <span>{currentTrack.progressPercent}% of cohort schedule</span>
                </div>
                <div className="w-full bg-[#EAE6D9] h-2">
                  <div
                    className="bg-[#B8341A] h-2 transition-all duration-500"
                    style={{ width: `${currentTrack.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            emptyState(
              "You are not enrolled in a training programme yet.",
              "/training",
              "Browse programmes →"
            )
          )}

          {unpaidApplications.length > 0 && (
            <div className="border border-[#B8341A] bg-[#FAF8F3] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-[#16150F]">
                <strong>
                  {unpaidApplications.length === 1
                    ? "1 application is"
                    : `${unpaidApplications.length} applications are`}{" "}
                  waiting for the registration fee.
                </strong>{" "}
                Applications reach our team once the fee is paid.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("applications")}
                className="self-start sm:self-auto px-4 py-2 bg-[#16150F] text-[#F5F2EA] text-xs font-mono hover:bg-[#B8341A] transition-colors"
              >
                Pay now →
              </button>
            </div>
          )}

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

            {applications.length === 0 ? (
              emptyState(
                "You have not applied to any internships yet.",
                "/internships",
                "Browse internships →"
              )
            ) : (
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
                  {applications.slice(0, 5).map((app) => (
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
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: MY APPLICATIONS                                              */}
      {/* =================================================================== */}
      {!loading && !loadError && activeTab === "applications" && (
        <div className="space-y-6">
          {applications.length === 0 ? (
            emptyState(
              "You have not applied to any internships yet.",
              "/internships",
              "Browse internships →"
            )
          ) : (
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
                          {app.company} · Applied on {app.appliedDate} · Stipend:{" "}
                          {app.stipend}
                        </p>
                      </div>
                      <div>{getStatusBadge(app.status)}</div>
                    </div>

                    {app.status === "PENDING_PAYMENT" && (
                      <div className="border border-[#B8341A] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-xs text-[#16150F]">
                          Pay the {formatMoney(app.feeAmount, "INR")} registration fee to
                          send this application to our team. Refunded in full if you are
                          not selected.
                        </p>
                        <button
                          type="button"
                          disabled={busyId === app.id}
                          onClick={() => handlePayFee(app.id)}
                          className="self-start sm:self-auto px-4 py-2 bg-[#B8341A] text-white text-xs font-mono font-bold hover:bg-[#16150F] transition-colors disabled:opacity-50"
                        >
                          {busyId === app.id
                            ? "Waiting for payment..."
                            : `Pay ${formatMoney(app.feeAmount, "INR")}`}
                        </button>
                      </div>
                    )}

                    {app.feeStatus && (
                      <p className="text-xs font-mono text-[#5A574D]">
                        Registration fee {formatMoney(app.feePaidAmount, "INR")}:{" "}
                        {app.feeStatus === "PAID"
                          ? "paid"
                          : app.feeStatus === "REFUNDED"
                            ? "refunded in full (allow 5 to 7 working days to reach your account)"
                            : "partly refunded"}
                      </p>
                    )}

                    {app.feedbackNote && (
                      <p className="text-xs text-[#16150F] border-l-2 border-[#16150F] pl-3">
                        Note from ByteHUB: {app.feedbackNote}
                      </p>
                    )}

                    {WITHDRAWABLE_STATES.has(app.status) && (
                      <div className="pt-2 flex items-center gap-3 text-xs">
                        <button
                          type="button"
                          disabled={busyId === app.id}
                          onClick={() => handleWithdraw(app.id)}
                          className="text-[#5A574D] hover:text-[#B8341A] font-mono underline disabled:opacity-50"
                        >
                          {busyId === app.id ? "Withdrawing..." : "Withdraw application"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: TRAINING & PROGRESS                                          */}
      {/* =================================================================== */}
      {!loading && !loadError && activeTab === "training" && (
        <div className="space-y-6">
          {activeEnrollments.length === 0 &&
            emptyState(
              "You are not enrolled in a training programme yet.",
              "/training",
              "Browse programmes →"
            )}

          {activeEnrollments.map((track) => (
            <div
              key={track.id}
              className="border border-[#D8D3C4] bg-[#FAF8F3] p-6 space-y-4"
            >
              <h2 className="font-heading text-xl font-bold">{track.programmeTitle}</h2>
              <p className="text-xs text-[#5A574D]">
                Cohort Code: {track.cohortCode} · Status: {track.status} · Starts{" "}
                {track.startDate} · {track.durationWeeks} weeks
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/student/offer-letter/${track.id}`}
                  className="px-3 py-1.5 border border-[#16150F] text-xs font-medium hover:bg-[#16150F] hover:text-[#F5F2EA] transition-colors"
                >
                  Internship Offer Letter →
                </Link>
                {track.certificate && (
                  <Link
                    href={`/verify/${encodeURIComponent(track.certificate.code)}`}
                    className="px-3 py-1.5 border border-[#B8341A] text-[#B8341A] text-xs font-medium hover:bg-[#B8341A] hover:text-white transition-colors"
                  >
                    Certificate →
                  </Link>
                )}
              </div>

              <div className="space-y-3 pt-4">
                <h3 className="font-mono text-xs uppercase tracking-wider font-semibold text-[#5A574D]">
                  Syllabus
                </h3>
                {track.weeks.length === 0 ? (
                  <p className="text-xs text-[#5A574D]">
                    The syllabus will be published before the cohort starts.
                  </p>
                ) : (
                  <div className="border border-[#D8D3C4] divide-y divide-[#D8D3C4]">
                    {track.weeks.map((w) => (
                      <div
                        key={w.week}
                        className="p-3.5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[#5A574D]">
                            Week {String(w.week).padStart(2, "0")}
                          </span>
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
                          {w.status.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: PAYMENTS & RECEIPTS                                          */}
      {/* =================================================================== */}
      {!loading && !loadError && activeTab === "payments" && (
        <div className="space-y-6">
          {payments.length === 0 ? (
            emptyState(
              "No payments yet. Receipts appear here after you pay for a programme or an internship registration fee."
            )
          ) : (
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
                    <div className="text-xs font-mono font-bold text-[#B8341A]">
                      {p.amount} · {p.status.replace("_", " ")}
                    </div>
                  </div>
                  {(p.status === "PAID" || p.status === "PARTIALLY_REFUNDED") && (
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          `/api/payments/${encodeURIComponent(p.orderId)}/invoice`,
                          "_blank"
                        )
                      }
                      className="self-start sm:self-auto px-4 py-2 border border-[#16150F] text-xs font-mono hover:bg-[#16150F] hover:text-[#F5F2EA] transition-colors"
                    >
                      Download PDF Receipt
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 5: CERTIFICATES                                                 */}
      {/* =================================================================== */}
      {!loading && !loadError && activeTab === "certificates" && (
        <div className="space-y-6">
          <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-6 space-y-4">
            <h2 className="font-heading text-lg font-bold">Issued Certificates</h2>
            {certificates.length === 0 ? (
              <p className="text-xs text-[#5A574D]">
                Certificates are issued when you complete a training programme.
              </p>
            ) : (
              <div className="border border-[#D8D3C4] divide-y divide-[#D8D3C4]">
                {certificates.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <h3 className="font-bold text-sm">{c.title}</h3>
                      <p className="text-xs text-[#5A574D] font-mono mt-0.5">
                        Code: {c.code} · Issued: {c.issuedAt}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/verify/${encodeURIComponent(c.code)}`}
                        className="px-3 py-1.5 bg-[#B8341A] text-white text-xs font-mono hover:bg-[#9C2B14]"
                      >
                        View &amp; Download
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleCopyCredential(c.code)}
                        className="px-3 py-1.5 border border-[#16150F] text-xs font-mono hover:bg-[#16150F] hover:text-white"
                      >
                        Copy Credential Code
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 6: PROFILE & PRIVACY (GDPR / DPDP)                              */}
      {/* =================================================================== */}
      {!loading && !loadError && activeTab === "profile" && (
        <div className="space-y-8 max-w-2xl">
          <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-6 space-y-4">
            <h2 className="font-heading text-lg font-bold">Student Profile Details</h2>
            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-[#5A574D] block">Full Name:</span>
                <span className="font-bold text-sm text-[#16150F]">
                  {profile?.name || ""}
                </span>
              </div>
              <div>
                <span className="text-[#5A574D] block">Email Address:</span>
                <span className="font-bold text-[#16150F]">
                  {profile?.email || ""}{" "}
                  <span
                    className={
                      profile?.isEmailVerified ? "text-green-800" : "text-[#B8341A]"
                    }
                  >
                    ({profile?.isEmailVerified ? "verified" : "not verified"})
                  </span>
                </span>
              </div>
              <div>
                <span className="text-[#5A574D] block">Role:</span>
                <span className="font-bold text-[#B8341A]">
                  {profile?.role || "STUDENT"}
                </span>
              </div>
            </div>
          </div>

          {/* Privacy & Data Protection Actions */}
          <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-6 space-y-4">
            <h2 className="font-heading text-lg font-bold text-[#B8341A]">
              Privacy & Data Protection (GDPR / DPDP)
            </h2>
            <p className="text-xs text-[#5A574D]">
              Under GDPR and India&apos;s DPDP regulations, you can download a complete
              machine-readable copy of all your profile, application, and transaction
              data, or permanently delete your account.
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
