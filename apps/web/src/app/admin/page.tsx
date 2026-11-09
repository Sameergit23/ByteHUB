"use client";

import { useState } from "react";
import Link from "next/link";
import { MOCK_INTERNSHIPS, MOCK_TRAINING_PROGRAMS } from "../../lib/mockData";

export default function AdminPanelPage() {
  const [activeTab, setActiveTab] = useState<"METRICS" | "POSTS" | "LEDGER" | "USERS">("METRICS");

  // Mock Admin state
  const [internships, setInternships] = useState(MOCK_INTERNSHIPS);

  const [ledger] = useState([
    {
      id: "tx_91827391",
      orderId: "order_rzp_17311451",
      user: "maya.sen@domain.edu",
      program: "Systems & Distributed Engineering",
      provider: "RAZORPAY",
      amountINR: 12499,
      status: "SUCCESS",
      time: "2026-11-09 14:20:12 IST",
    },
    {
      id: "tx_91827392",
      orderId: "pi_stripe_17311452",
      user: "alex.k@mit.edu",
      program: "Systems & Distributed Engineering",
      provider: "STRIPE",
      amountUSD: 149,
      status: "SUCCESS",
      time: "2026-11-09 13:10:04 IST",
    },
    {
      id: "tx_91827393",
      orderId: "order_rzp_17311453",
      user: "dev.patel@domain.edu",
      program: "Production Full-Stack Architecture",
      provider: "RAZORPAY",
      amountINR: 9999,
      status: "SUCCESS",
      time: "2026-11-08 18:44:29 IST",
    },
  ]);

  const [users] = useState([
    {
      id: "usr_01",
      name: "Saim Ansari",
      email: "admin@bytehub.io",
      role: "ADMIN",
      joined: "2026-09-01",
    },
    {
      id: "usr_02",
      name: "HyperGrid Systems",
      email: "recruiting@hypergrid.io",
      role: "COMPANY",
      joined: "2026-10-12",
    },
    {
      id: "usr_03",
      name: "Maya Sen",
      email: "maya.sen@domain.edu",
      role: "STUDENT",
      joined: "2026-11-02",
    },
  ]);

  const toggleInternshipStatus = (id: string) => {
    setInternships((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="border-2 border-ink p-8 bg-white space-y-4">
        <div className="flex flex-wrap items-center justify-between text-xs font-mono uppercase tracking-widest text-editorial-muted border-b border-editorial-border pb-3">
          <span className="text-accent font-bold">[ BYTEHUB SYSTEM SUPERVISOR ]</span>
          <span>ROOT ACCESS LEVEL // ADMIN</span>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-ink">
              CENTRAL ADMINISTRATION & AUDIT
            </h1>
            <p className="text-xs font-mono text-editorial-muted mt-1">
              PLATFORM INTEGRITY MONITORING & MULTI-GATEWAY FINANCIAL LEDGER
            </p>
          </div>
          <div className="flex gap-2">
            <span className="border border-green-700 bg-green-50 text-green-900 px-3 py-1 text-xs font-mono font-bold">
              SYSTEM: HEALTHY
            </span>
            <span className="border border-editorial-border px-3 py-1 text-xs font-mono text-editorial-muted">
              POSTGRESQL ACID: ACTIVE
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border border-editorial-border bg-white text-xs font-mono divide-x divide-editorial-border">
        {(["METRICS", "POSTS", "LEDGER", "USERS"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-bold transition-colors ${
              activeTab === tab
                ? "bg-ink text-canvas"
                : "text-editorial-muted hover:text-ink hover:bg-canvas"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB 1: METRICS */}
      {activeTab === "METRICS" && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-l border-editorial-border bg-white font-mono text-xs">
            <div className="border-r border-b border-editorial-border p-6 space-y-1">
              <div className="text-editorial-muted">REGISTERED USERS</div>
              <div className="font-heading text-3xl font-bold text-ink">1,420</div>
            </div>
            <div className="border-r border-b border-editorial-border p-6 space-y-1">
              <div className="text-editorial-muted">ACTIVE INTERNSHIPS</div>
              <div className="font-heading text-3xl font-bold text-ink">{internships.length}</div>
            </div>
            <div className="border-r border-b border-editorial-border p-6 space-y-1">
              <div className="text-editorial-muted">PROCESSED REVENUE (INR)</div>
              <div className="font-heading text-3xl font-bold text-ink">₹8,45,000</div>
            </div>
            <div className="border-r border-b border-editorial-border p-6 space-y-1">
              <div className="text-editorial-muted">GLOBAL REVENUE (USD)</div>
              <div className="font-heading text-3xl font-bold text-accent">$4,920</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-editorial-border p-6 bg-white space-y-3 font-mono text-xs">
              <h3 className="font-bold uppercase text-editorial-muted border-b border-editorial-border pb-2">
                [ SECURITY & AUDIT STATUS ]
              </h3>
              <div className="divide-y divide-editorial-line text-[11px] space-y-2">
                <div className="pt-2 flex justify-between">
                  <span>WCAG 2.2 AA Contrast Compliance</span>
                  <span className="text-green-700 font-bold">PASS (4.5:1+)</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span>Razorpay Webhook Signature Verification</span>
                  <span className="text-green-700 font-bold">HMAC-SHA256 ENFORCED</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span>Stripe 3D Secure 2 Validation</span>
                  <span className="text-green-700 font-bold">ENABLED</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span>Zod Strict Server Validation</span>
                  <span className="text-green-700 font-bold">100% ENDPOINTS</span>
                </div>
              </div>
            </div>

            <div className="border border-editorial-border p-6 bg-white space-y-3 font-mono text-xs">
              <h3 className="font-bold uppercase text-editorial-muted border-b border-editorial-border pb-2">
                [ ACTIVE TRAINING COHORTS ]
              </h3>
              <div className="space-y-3">
                {MOCK_TRAINING_PROGRAMS.map((prog) => (
                  <div key={prog.id} className="border border-editorial-border p-3 space-y-1">
                    <div className="font-bold text-ink">{prog.title}</div>
                    <div className="text-[11px] text-editorial-muted flex justify-between">
                      <span>Seats: {prog.seatsLeft} of {prog.seatsTotal} remaining</span>
                      <span className="text-accent font-bold">₹{prog.priceINR}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: POSTS */}
      {activeTab === "POSTS" && (
        <div className="border border-editorial-border bg-white p-6 space-y-4 font-mono text-xs">
          <div className="flex justify-between items-center border-b border-editorial-border pb-3">
            <h2 className="font-bold uppercase text-editorial-muted">
              [ MODERATE PUBLISHED INTERNSHIP POSTINGS ]
            </h2>
            <Link href="/for-companies" className="underline font-bold text-accent">
              + Post New Listing
            </Link>
          </div>

          <div className="divide-y divide-editorial-border">
            {internships.map((post) => (
              <div key={post.id} className="py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <div className="font-bold text-ink text-sm">{post.title}</div>
                  <div className="text-editorial-muted text-[11px]">
                    {post.companyName} • {post.location} • ₹{post.stipend.toLocaleString("en-IN")}/mo
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="border border-green-700 px-2 py-0.5 text-green-800 text-[10px] font-bold">
                    VERIFIED STIPEND
                  </span>
                  <button
                    onClick={() => toggleInternshipStatus(post.id)}
                    className="border border-accent text-accent px-3 py-1 hover:bg-accent hover:text-white transition-colors"
                  >
                    DELIST POST
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LEDGER */}
      {activeTab === "LEDGER" && (
        <div className="border border-editorial-border bg-white p-6 space-y-4 font-mono text-xs">
          <div className="border-b border-editorial-border pb-3">
            <h2 className="font-bold uppercase text-editorial-muted">
              [ TRANSACTION AUDIT LEDGER // ACID SETTLEMENT ]
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-editorial-border text-editorial-muted text-[11px]">
                  <th className="py-2">TX ID</th>
                  <th className="py-2">ORDER REF</th>
                  <th className="py-2">USER</th>
                  <th className="py-2">PROGRAM</th>
                  <th className="py-2">GATEWAY</th>
                  <th className="py-2">SETTLED AMOUNT</th>
                  <th className="py-2">TIMESTAMP</th>
                  <th className="py-2 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-editorial-line">
                {ledger.map((item) => (
                  <tr key={item.id} className="hover:bg-canvas">
                    <td className="py-3 font-bold">{item.id}</td>
                    <td className="py-3 text-editorial-muted text-[11px]">{item.orderId}</td>
                    <td className="py-3">{item.user}</td>
                    <td className="py-3">{item.program}</td>
                    <td className="py-3 font-semibold">{item.provider}</td>
                    <td className="py-3 font-bold">
                      {item.amountINR ? `₹${item.amountINR.toLocaleString("en-IN")}` : `$${item.amountUSD}`}
                    </td>
                    <td className="py-3 text-editorial-muted text-[11px]">{item.time}</td>
                    <td className="py-3 text-right">
                      <span className="border border-green-700 text-green-800 px-1.5 py-0.5 text-[10px] font-bold">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: USERS */}
      {activeTab === "USERS" && (
        <div className="border border-editorial-border bg-white p-6 space-y-4 font-mono text-xs">
          <div className="border-b border-editorial-border pb-3">
            <h2 className="font-bold uppercase text-editorial-muted">
              [ REGISTERED IDENTITY DIRECTORY ]
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-editorial-border text-editorial-muted text-[11px]">
                  <th className="py-2">USER ID</th>
                  <th className="py-2">LEGAL NAME</th>
                  <th className="py-2">EMAIL ADDRESS</th>
                  <th className="py-2">SYSTEM ROLE</th>
                  <th className="py-2">REGISTERED</th>
                  <th className="py-2 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-editorial-line">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-canvas">
                    <td className="py-3 text-editorial-muted">#{u.id}</td>
                    <td className="py-3 font-bold">{u.name}</td>
                    <td className="py-3">{u.email}</td>
                    <td className="py-3">
                      <span className="border border-ink px-1.5 py-0.5 text-[10px] font-bold">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 text-editorial-muted">{u.joined}</td>
                    <td className="py-3 text-right">
                      <span className="text-green-700 font-bold">ACTIVE</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
