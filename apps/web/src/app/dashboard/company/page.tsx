"use client";

import { useEffect, useState } from "react";
import { DashboardLayout, NavItem } from "../../../components/dashboard/DashboardLayout";
import { getStoredUser, apiFetch } from "../../../lib/api";

const COMPANY_NAV: NavItem[] = [
  { id: "overview", label: "Overview" },
  { id: "applicants", label: "Review Applicants", badge: 3 },
  { id: "post-job", label: "Post New Internship" },
  { id: "listings", label: "Active Listings", badge: 2 },
];

export default function CompanyDashboardPage() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  // Postings mock
  const [listings, setListings] = useState([
    {
      id: "intern-01",
      title: "Frontend Developer Intern",
      track: "Web Development",
      type: "REMOTE",
      stipend: "₹35,000 / mo",
      deadline: "2026-12-15",
      applicantsCount: 2,
      status: "PUBLISHED",
    },
    {
      id: "intern-02",
      title: "Backend Developer Intern",
      track: "Systems Engineering",
      type: "ON_SITE",
      stipend: "₹40,000 / mo",
      deadline: "2026-12-20",
      applicantsCount: 1,
      status: "PUBLISHED",
    },
  ]);

  // Applicants mock
  const [applicants, setApplicants] = useState([
    {
      id: "app-819",
      candidateName: "Rohan Sharma",
      candidateEmail: "rohan.sharma@example.com",
      college: "BMS College of Engineering",
      degree: "B.Tech Computer Science",
      role: "Frontend Developer Intern",
      appliedDate: "2026-11-08",
      resumeUrl: "/api/applications/app-819/resume",
      status: "UNDER_REVIEW",
    },
    {
      id: "app-812",
      candidateName: "Pooja Nair",
      candidateEmail: "pooja.nair@example.com",
      college: "PES University",
      degree: "B.Tech Information Science",
      role: "Frontend Developer Intern",
      appliedDate: "2026-11-07",
      resumeUrl: "/api/applications/app-812/resume",
      status: "SHORTLISTED",
    },
    {
      id: "app-804",
      candidateName: "Aman Gupta",
      candidateEmail: "aman.gupta@example.com",
      college: "RV College of Engineering",
      degree: "B.E Electronics",
      role: "Backend Developer Intern",
      appliedDate: "2026-11-06",
      resumeUrl: "/api/applications/app-804/resume",
      status: "SUBMITTED",
    },
  ]);

  // Post form state
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("REMOTE");
  const [newStipend, setNewStipend] = useState("35000");
  const [newDeadline, setNewDeadline] = useState("2026-12-31");
  const [formSuccess, setFormSuccess] = useState(false);

  const handleStatusChange = (appId: string, newStatus: string) => {
    setApplicants(
      applicants.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
    );
  };

  const handleCreatePosting = (e: React.FormEvent) => {
    e.preventDefault();
    const newPosting = {
      id: `intern-${Date.now()}`,
      title: newTitle || "Full-Stack Engineering Intern",
      track: "Web Development",
      type: newType,
      stipend: `₹${parseInt(newStipend || "35000", 10).toLocaleString("en-IN")} / mo`,
      deadline: newDeadline,
      applicantsCount: 0,
      status: "PUBLISHED",
    };
    setListings([newPosting, ...listings]);
    setFormSuccess(true);
    setTimeout(() => {
      setFormSuccess(false);
      setActiveTab("listings");
    }, 1200);
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
      role="COMPANY"
      title="Company Portal"
      subtitle="Manage your posted internship listings, evaluate candidate pipelines, and review resumes."
      navItems={COMPANY_NAV}
      activeNavId={activeTab}
      onNavSelect={setActiveTab}
      actions={
        <button
          type="button"
          onClick={() => setActiveTab("post-job")}
          className="px-4 py-2 bg-[#B8341A] text-white text-xs font-medium uppercase tracking-wider hover:bg-[#962B15] transition-colors"
        >
          + Post Internship
        </button>
      }
    >
      {/* =================================================================== */}
      {/* TAB 1: OVERVIEW                                                     */}
      {/* =================================================================== */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[11px] font-mono uppercase text-[#5A574D] block">
                Active Listings
              </span>
              <span className="font-heading text-2xl font-bold mt-1 block">
                {listings.length}
              </span>
            </div>
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[11px] font-mono uppercase text-[#5A574D] block">
                Total Applicants
              </span>
              <span className="font-heading text-2xl font-bold mt-1 block">
                {applicants.length}
              </span>
            </div>
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[11px] font-mono uppercase text-[#5A574D] block">
                Under Review
              </span>
              <span className="font-heading text-2xl font-bold mt-1 block text-[#16150F]">
                {applicants.filter((a) => a.status === "UNDER_REVIEW").length}
              </span>
            </div>
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[11px] font-mono uppercase text-[#5A574D] block">
                Shortlisted
              </span>
              <span className="font-heading text-2xl font-bold mt-1 block text-[#B8341A]">
                {applicants.filter((a) => a.status === "SHORTLISTED").length}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-heading text-lg font-bold">Recent Candidate Applications</h2>
              <button
                type="button"
                onClick={() => setActiveTab("applicants")}
                className="text-xs text-[#B8341A] font-mono hover:underline"
              >
                View all ({applicants.length}) →
              </button>
            </div>

            <div className="border border-[#D8D3C4] bg-[#FAF8F3] divide-y divide-[#D8D3C4]">
              {applicants.slice(0, 2).map((app) => (
                <div
                  key={app.id}
                  className="p-4 sm:flex sm:items-center sm:justify-between space-y-2 sm:space-y-0"
                >
                  <div>
                    <div className="font-bold text-sm text-[#16150F]">{app.candidateName}</div>
                    <div className="text-xs text-[#5A574D]">
                      {app.role} · {app.college}
                    </div>
                  </div>
                  <div>{getStatusBadge(app.status)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: APPLICANTS PIPELINE                                          */}
      {/* =================================================================== */}
      {activeTab === "applicants" && (
        <div className="space-y-6">
          <div className="border border-[#D8D3C4] bg-[#FAF8F3] divide-y divide-[#D8D3C4]">
            {applicants.map((app) => (
              <div key={app.id} className="p-4 sm:p-6 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h3 className="font-heading font-bold text-base text-[#16150F]">
                      {app.candidateName}
                    </h3>
                    <p className="text-xs text-[#5A574D]">
                      {app.role} · Applied on {app.appliedDate}
                    </p>
                    <p className="text-xs font-mono text-[#5A574D] mt-1">
                      {app.degree} · {app.college} · {app.candidateEmail}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#5A574D]">Status:</span>
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      className="px-2.5 py-1 text-xs border border-[#16150F] bg-white font-mono"
                    >
                      <option value="SUBMITTED">SUBMITTED</option>
                      <option value="UNDER_REVIEW">UNDER REVIEW</option>
                      <option value="SHORTLISTED">SHORTLISTED</option>
                      <option value="ACCEPTED">ACCEPTED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-4 text-xs font-mono">
                  <a
                    href={app.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#16150F] hover:text-[#B8341A] underline font-medium"
                  >
                    ↓ Download Verified Resume (PDF)
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: POST INTERNSHIP FORM                                         */}
      {/* =================================================================== */}
      {activeTab === "post-job" && (
        <div className="max-w-2xl border border-[#D8D3C4] bg-[#FAF8F3] p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="font-heading text-xl font-bold">Post a New Internship</h2>
            <p className="text-xs text-[#5A574D] mt-1">
              Create an internship opening for vetted ByteHUB students and graduates.
            </p>
          </div>

          {formSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs">
              ✓ Internship posting successfully created and published!
            </div>
          )}

          <form onSubmit={handleCreatePosting} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium mb-1 text-[#16150F]">Job Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Distributed Systems Engineer Intern"
                className="w-full px-3 py-2 border border-[#D8D3C4] bg-white text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1 text-[#16150F]">Mode</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8D3C4] bg-white text-sm"
                >
                  <option value="REMOTE">REMOTE</option>
                  <option value="ON_SITE">ON_SITE</option>
                  <option value="HYBRID">HYBRID</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1 text-[#16150F]">Monthly Stipend (INR)</label>
                <input
                  type="number"
                  required
                  value={newStipend}
                  onChange={(e) => setNewStipend(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8D3C4] bg-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium mb-1 text-[#16150F]">Application Deadline</label>
              <input
                type="date"
                required
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="w-full px-3 py-2 border border-[#D8D3C4] bg-white text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#B8341A] text-white font-medium text-xs uppercase tracking-wider hover:bg-[#962B15] transition-colors"
            >
              Publish Internship Posting
            </button>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: ACTIVE LISTINGS                                              */}
      {/* =================================================================== */}
      {activeTab === "listings" && (
        <div className="space-y-4">
          <div className="border border-[#D8D3C4] bg-[#FAF8F3] divide-y divide-[#D8D3C4]">
            {listings.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <h3 className="font-heading font-bold text-base">{item.title}</h3>
                  <p className="text-xs text-[#5A574D]">
                    {item.track} · {item.type} · Stipend: {item.stipend} · Deadline: {item.deadline}
                  </p>
                  <p className="text-xs font-mono text-[#B8341A] mt-1">
                    {item.applicantsCount} Total Applicants
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-[#16150F] text-[#F5F2EA] text-[10px] font-mono">
                    {item.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("applicants")}
                    className="px-3 py-1.5 border border-[#16150F] text-xs font-mono hover:bg-[#16150F] hover:text-[#F5F2EA]"
                  >
                    View Applicants
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
