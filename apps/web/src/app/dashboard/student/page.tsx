"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStoredUser, StoredUser } from "../../../lib/api";

interface ApplicationRecord {
  id: string;
  role: string;
  company: string;
  stipend: string;
  appliedDate: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "SHORTLISTED" | "ACCEPTED" | "REJECTED";
}

interface EnrolledTrack {
  id: string;
  title: string;
  cohort: string;
  progressPercent: number;
  currentWeek: string;
  status: "ACTIVE" | "COMPLETED";
}

interface PaymentRecord {
  id: string;
  program: string;
  amount: string;
  gateway: "RAZORPAY" | "STRIPE";
  date: string;
  status: "SUCCESS" | "PENDING";
}

export default function StudentDashboardPage() {
  const [user, setUser] = useState<StoredUser | null>(null);

  // Initial student demo state
  const [applications] = useState<ApplicationRecord[]>([
    {
      id: "app-819",
      role: "Distributed Systems & Storage Intern",
      company: "HyperGrid Labs",
      stipend: "₹45,000 / mo",
      appliedDate: "2026-11-08",
      status: "UNDER_REVIEW",
    },
    {
      id: "app-812",
      role: "Full-Stack TypeScript Engineer Intern",
      company: "KiteMetrics HQ",
      stipend: "₹38,000 / mo",
      appliedDate: "2026-11-04",
      status: "SHORTLISTED",
    },
  ]);

  const [enrolledTracks] = useState<EnrolledTrack[]>([
    {
      id: "track-01",
      title: "Systems & Distributed Engineering",
      cohort: "Winter Cohort 2026",
      progressPercent: 40,
      currentWeek: "Week 04: Distributed Consensus (Raft)",
      status: "ACTIVE",
    },
  ]);

  const [payments] = useState<PaymentRecord[]>([
    {
      id: "pay_rzp_981273981",
      program: "Systems & Distributed Engineering",
      amount: "₹12,499",
      gateway: "RAZORPAY",
      date: "2026-11-01",
      status: "SUCCESS",
    },
  ]);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Editorial Masthead */}
      <div className="border border-editorial-border p-8 bg-white space-y-4">
        <div className="flex flex-wrap items-center justify-between text-xs font-mono uppercase tracking-widest text-editorial-muted border-b border-editorial-border pb-3">
          <span>// CANDIDATE PROFILE TERMINAL</span>
          <span>ROLE: VERIFIED ENGINEERING STUDENT</span>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-ink">
              {user ? user.name.toUpperCase() : "STUDENT WORKSPACE"}
            </h1>
            <p className="text-xs font-mono text-editorial-muted mt-1">
              ACCOUNT ID: #{user?.id || "usr_student_demo"} | STATUS: AUDITED
            </p>
          </div>
          <Link
            href="/internships"
            className="border border-ink bg-ink text-canvas hover:bg-accent hover:border-accent hover:text-white px-4 py-2 text-xs font-mono font-bold tracking-wider transition-colors"
          >
            + DISCOVER NEW OPENINGS
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-t border-l border-editorial-border bg-white">
        <div className="border-r border-b border-editorial-border p-6 font-mono text-xs space-y-1">
          <div className="text-editorial-muted">ACTIVE APPLICATIONS</div>
          <div className="font-heading text-2xl font-bold text-ink">{applications.length}</div>
        </div>
        <div className="border-r border-b border-editorial-border p-6 font-mono text-xs space-y-1">
          <div className="text-editorial-muted">INTERVIEW SHORTLISTS</div>
          <div className="font-heading text-2xl font-bold text-accent">1</div>
        </div>
        <div className="border-r border-b border-editorial-border p-6 font-mono text-xs space-y-1">
          <div className="text-editorial-muted">ENROLLED LAB TRACKS</div>
          <div className="font-heading text-2xl font-bold text-ink">{enrolledTracks.length}</div>
        </div>
        <div className="border-r border-b border-editorial-border p-6 font-mono text-xs space-y-1">
          <div className="text-editorial-muted">TRANSACTION STATUS</div>
          <div className="font-heading text-2xl font-bold text-green-700">VERIFIED</div>
        </div>
      </div>

      {/* Section 1: Active Internship Applications */}
      <div className="border border-editorial-border bg-white p-6 sm:p-8 space-y-4">
        <div className="border-b border-editorial-border pb-3 flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-editorial-muted">
            [ 01 // SUBMITTED INTERNSHIP APPLICATIONS ]
          </h2>
          <span className="text-xs font-mono text-editorial-muted">
            {applications.length} RECORDS
          </span>
        </div>

        <div className="divide-y divide-editorial-border font-mono text-xs">
          {applications.map((app) => (
            <div
              key={app.id}
              className="py-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
            >
              <div className="md:col-span-1 text-editorial-muted">#{app.id}</div>
              <div className="md:col-span-6 space-y-0.5">
                <div className="font-bold text-ink text-sm">{app.role}</div>
                <div className="text-editorial-muted">
                  {app.company} • Stipend: {app.stipend}
                </div>
              </div>
              <div className="md:col-span-2 text-editorial-muted">
                Applied: {app.appliedDate}
              </div>
              <div className="md:col-span-3 flex items-center justify-start md:justify-end">
                <span
                  className={`border px-2.5 py-1 text-[11px] font-bold ${
                    app.status === "SHORTLISTED"
                      ? "border-green-600 bg-green-50 text-green-800"
                      : app.status === "UNDER_REVIEW"
                      ? "border-blue-600 bg-blue-50 text-blue-800"
                      : "border-editorial-border text-editorial-muted"
                  }`}
                >
                  [{app.status}]
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Enrolled Training Labs */}
      <div className="border border-editorial-border bg-white p-6 sm:p-8 space-y-4">
        <div className="border-b border-editorial-border pb-3 flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-editorial-muted">
            [ 02 // ENROLLED TRAINING PROGRAMMES & LAB BENCHES ]
          </h2>
          <Link href="/training" className="text-xs font-mono text-accent font-bold hover:underline">
            EXPLORE MORE TRACKS →
          </Link>
        </div>

        <div className="divide-y divide-editorial-border space-y-4 font-mono text-xs">
          {enrolledTracks.map((track) => (
            <div key={track.id} className="pt-4 first:pt-0 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-heading text-lg font-bold text-ink">
                    {track.title}
                  </h3>
                  <div className="text-editorial-muted text-[11px]">
                    {track.cohort} • STATUS: {track.status}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-ink font-bold">{track.progressPercent}% COMPLETE</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-editorial-line h-2">
                <div
                  className="bg-accent h-2 transition-all duration-300"
                  style={{ width: `${track.progressPercent}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="text-editorial-muted">
                  CURRENT BENCHMARK: <strong className="text-ink">{track.currentWeek}</strong>
                </div>
                <div className="flex gap-2">
                  <button className="border border-editorial-border px-3 py-1 hover:border-ink">
                    LAB REPO
                  </button>
                  <button className="border border-ink bg-ink text-canvas px-3 py-1 hover:bg-accent hover:border-accent">
                    SUBMIT DELIVERABLE
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Billing & Payments Ledger */}
      <div className="border border-editorial-border bg-white p-6 sm:p-8 space-y-4">
        <div className="border-b border-editorial-border pb-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-editorial-muted">
            [ 03 // ACID PAYMENT AUDIT LEDGER ]
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs text-left">
            <thead>
              <tr className="border-b border-editorial-border text-editorial-muted">
                <th className="py-2">TRANSACTION ID</th>
                <th className="py-2">PROGRAM DESCRIPTION</th>
                <th className="py-2">GATEWAY</th>
                <th className="py-2">AMOUNT</th>
                <th className="py-2">TIMESTAMP</th>
                <th className="py-2 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-editorial-line">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 font-semibold text-ink">{p.id}</td>
                  <td className="py-3">{p.program}</td>
                  <td className="py-3">{p.gateway}</td>
                  <td className="py-3 font-bold">{p.amount}</td>
                  <td className="py-3 text-editorial-muted">{p.date}</td>
                  <td className="py-3 text-right">
                    <span className="text-green-700 font-bold border border-green-700 px-1.5 py-0.5 text-[10px]">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

