"use client";

import { useState } from "react";
import Link from "next/link";
import { getStoredUser } from "../../../lib/api";

interface CandidateApplication {
  id: string;
  candidateName: string;
  email: string;
  college: string;
  degree: string;
  githubUrl: string;
  linkedinUrl: string;
  resumeUrl: string;
  roleTitle: string;
  appliedDate: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "SHORTLISTED" | "ACCEPTED" | "REJECTED";
  whyInterested: string;
  projectDescription: string;
}

export default function CompanyDashboardPage() {
  const user = getStoredUser();

  const [applications, setApplications] = useState<CandidateApplication[]>([
    {
      id: "app-101",
      candidateName: "Maya Sen",
      email: "maya.sen@domain.edu",
      college: "Indian Institute of Technology",
      degree: "B.Tech Computer Science (2026)",
      githubUrl: "https://github.com/mayasen",
      linkedinUrl: "https://linkedin.com/in/mayasen",
      resumeUrl: "https://drive.google.com/file/d/sample-resume",
      roleTitle: "Distributed Systems & Storage Intern",
      appliedDate: "2026-11-08",
      status: "SUBMITTED",
      whyInterested:
        "Passionate about write-ahead logging (WAL), consensus safety invariants, and building resilient storage engines under high concurrency.",
      projectDescription:
        "Built a crash-recoverable Raft state machine in Rust with fault-injection chaos testing harnesses.",
    },
    {
      id: "app-102",
      candidateName: "Rohan Varma",
      email: "rohan.v@domain.edu",
      college: "BITS Pilani",
      degree: "B.E. Computer Science (2025)",
      githubUrl: "https://github.com/rohanvarma",
      linkedinUrl: "https://linkedin.com/in/rohanvarma",
      resumeUrl: "https://drive.google.com/file/d/sample-resume-rohan",
      roleTitle: "Full-Stack TypeScript Engineer Intern",
      appliedDate: "2026-11-06",
      status: "SHORTLISTED",
      whyInterested:
        "Have built complex enterprise interfaces with Next.js App Router and strict schema validations. Eager to ship high-speed analytical consoles.",
      projectDescription:
        "Engineered a distributed telemetry dashboard with WebSocket streaming and sub-50ms render times.",
    },
  ]);

  const [activeTab, setActiveTab] = useState<"ALL" | "SUBMITTED" | "SHORTLISTED">("ALL");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateApplication | null>(null);

  const updateStatus = (id: string, newStatus: CandidateApplication["status"]) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
    );
    if (selectedCandidate && selectedCandidate.id === id) {
      setSelectedCandidate({ ...selectedCandidate, status: newStatus });
    }
  };

  const filtered = applications.filter((app) => {
    if (activeTab === "ALL") return true;
    return app.status === activeTab;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Masthead */}
      <div className="border border-editorial-border p-8 bg-white space-y-4">
        <div className="flex flex-wrap items-center justify-between text-xs font-mono uppercase tracking-widest text-editorial-muted border-b border-editorial-border pb-3">
          <span>// EMPLOYER CONTROL CONSOLE</span>
          <span>ENTERPRISE CANDIDATE PIPELINE</span>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-ink">
              {user?.organizationName || user?.name || "RECRUITER WORKSPACE"}
            </h1>
            <p className="text-xs font-mono text-editorial-muted mt-1">
              STATUS: VETTED EMPLOYER // STANDARDS COMPLIANT
            </p>
          </div>
          <Link
            href="/for-companies"
            className="border-2 border-ink bg-ink text-canvas hover:bg-accent hover:border-accent hover:text-white px-5 py-2.5 text-xs font-mono font-bold tracking-wider transition-colors"
          >
            + PUBLISH NEW OPENING
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-t border-l border-editorial-border bg-white font-mono text-xs">
        <div className="border-r border-b border-editorial-border p-6 space-y-1">
          <div className="text-editorial-muted">ACTIVE INTERNSHIP POSTS</div>
          <div className="font-heading text-2xl font-bold text-ink">2</div>
        </div>
        <div className="border-r border-b border-editorial-border p-6 space-y-1">
          <div className="text-editorial-muted">TOTAL APPLICANTS</div>
          <div className="font-heading text-2xl font-bold text-ink">{applications.length}</div>
        </div>
        <div className="border-r border-b border-editorial-border p-6 space-y-1">
          <div className="text-editorial-muted">SHORTLISTED CANDIDATES</div>
          <div className="font-heading text-2xl font-bold text-accent">
            {applications.filter((a) => a.status === "SHORTLISTED").length}
          </div>
        </div>
        <div className="border-r border-b border-editorial-border p-6 space-y-1">
          <div className="text-editorial-muted">AVG. TIME TO EVALUATION</div>
          <div className="font-heading text-2xl font-bold text-ink">2.4 DAYS</div>
        </div>
      </div>

      {/* Main Review Section */}
      <div className="border border-editorial-border bg-white p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-editorial-border pb-4">
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-editorial-muted">
              [ CANDIDATE EVALUATION PIPELINE ]
            </h2>
          </div>

          <div className="flex gap-2 font-mono text-xs">
            {(["ALL", "SUBMITTED", "SHORTLISTED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`border px-3 py-1.5 transition-colors ${
                  activeTab === tab
                    ? "border-ink bg-ink text-canvas font-bold"
                    : "border-editorial-border text-editorial-muted hover:border-ink"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Candidate List & Detail Split */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start font-mono text-xs">
          {/* Candidates List */}
          <div className="md:col-span-7 divide-y divide-editorial-border border border-editorial-border">
            {filtered.map((candidate) => (
              <div
                key={candidate.id}
                onClick={() => setSelectedCandidate(candidate)}
                className={`p-4 cursor-pointer transition-colors space-y-2 ${
                  selectedCandidate?.id === candidate.id
                    ? "bg-canvas border-l-4 border-l-accent"
                    : "bg-white hover:bg-editorial-surface"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-ink">{candidate.candidateName}</span>
                  <span
                    className={`border px-2 py-0.5 text-[10px] font-bold ${
                      candidate.status === "SHORTLISTED"
                        ? "border-green-600 bg-green-50 text-green-800"
                        : "border-editorial-border text-editorial-muted"
                    }`}
                  >
                    {candidate.status}
                  </span>
                </div>

                <div className="text-editorial-muted text-[11px]">
                  {candidate.roleTitle}
                </div>

                <div className="text-editorial-muted text-[10px]">
                  {candidate.degree} • {candidate.college}
                </div>
              </div>
            ))}
          </div>

          {/* Candidate Dossier View */}
          <div className="md:col-span-5 border border-editorial-border p-6 bg-canvas space-y-4">
            {selectedCandidate ? (
              <>
                <div className="border-b border-editorial-line pb-3 space-y-1">
                  <div className="text-[10px] text-accent font-bold uppercase">
                    CANDIDATE DOSSIER // #{selectedCandidate.id}
                  </div>
                  <h3 className="font-heading text-lg font-bold text-ink">
                    {selectedCandidate.candidateName}
                  </h3>
                  <div className="text-editorial-muted text-[11px]">
                    {selectedCandidate.email}
                  </div>
                </div>

                <div className="space-y-3 text-[11px]">
                  <div>
                    <span className="text-editorial-muted block font-semibold">EDUCATION:</span>
                    <span>
                      {selectedCandidate.degree}, {selectedCandidate.college}
                    </span>
                  </div>

                  <div>
                    <span className="text-editorial-muted block font-semibold">VERIFIED LINKS:</span>
                    <div className="flex gap-3 pt-1">
                      <a
                        href={selectedCandidate.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-accent font-bold"
                      >
                        GitHub ↗
                      </a>
                      <a
                        href={selectedCandidate.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-ink"
                      >
                        LinkedIn ↗
                      </a>
                      <a
                        href={selectedCandidate.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-ink"
                      >
                        Resume PDF ↗
                      </a>
                    </div>
                  </div>

                  <div>
                    <span className="text-editorial-muted block font-semibold">
                      TECHNICAL PROJECT BREAKDOWN:
                    </span>
                    <p className="mt-1 leading-relaxed bg-white border border-editorial-border p-2.5">
                      {selectedCandidate.projectDescription}
                    </p>
                  </div>

                  <div>
                    <span className="text-editorial-muted block font-semibold">
                      CANDIDATE MOTIVATION:
                    </span>
                    <p className="mt-1 leading-relaxed bg-white border border-editorial-border p-2.5">
                      {selectedCandidate.whyInterested}
                    </p>
                  </div>
                </div>

                {/* Status update actions */}
                <div className="pt-4 border-t border-editorial-line space-y-2">
                  <span className="text-[10px] text-editorial-muted uppercase block">
                    PIPELINE ACTIONS:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => updateStatus(selectedCandidate.id, "SHORTLISTED")}
                      className="border border-green-700 bg-green-50 text-green-900 py-2 font-bold hover:bg-green-100 transition-colors"
                    >
                      SHORTLIST
                    </button>
                    <button
                      onClick={() => updateStatus(selectedCandidate.id, "ACCEPTED")}
                      className="border border-ink bg-ink text-canvas py-2 font-bold hover:bg-accent transition-colors"
                    >
                      ACCEPT
                    </button>
                    <button
                      onClick={() => updateStatus(selectedCandidate.id, "REJECTED")}
                      className="border border-editorial-border text-editorial-muted py-2 hover:border-red-600 hover:text-red-700 transition-colors"
                    >
                      REJECT
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-editorial-muted space-y-2">
                <p>[ SELECT A CANDIDATE FROM THE LIST ]</p>
                <p className="text-[11px]">Click any candidate to inspect their code and portfolio.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

