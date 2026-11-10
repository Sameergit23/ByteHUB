"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardLayout, NavItem } from "../../../components/dashboard/DashboardLayout";
import {
  apiFetch,
  ApiError,
  getStoredUser,
  redirectToLogin,
  StoredUser,
} from "../../../lib/api";
import { formatDate, formatStipend, formatWorkMode } from "../../../lib/format";

/* eslint-disable @typescript-eslint/no-explicit-any -- API payloads are mapped field by field below */

interface Listing {
  id: string;
  title: string;
  track: string;
  type: string;
  stipend: string;
  deadline: string;
  applicantsCount: number;
  status: string;
}

interface Applicant {
  id: string;
  internshipId: string;
  candidateName: string;
  candidateEmail: string;
  college: string;
  degree: string;
  role: string;
  appliedDate: string;
  status: string;
}

const PIPELINE_STATUSES = [
  { value: "SUBMITTED", label: "SUBMITTED" },
  { value: "UNDER_REVIEW", label: "UNDER REVIEW" },
  { value: "INTERVIEW", label: "INTERVIEW" },
  { value: "OFFERED", label: "OFFERED" },
  { value: "REJECTED", label: "REJECTED" },
];

const emptyPosting = {
  title: "",
  location: "",
  type: "REMOTE",
  stipend: "",
  durationMonths: "3",
  openings: "1",
  deadline: "",
  description: "",
  requirements: "",
  skills: "",
};

const splitLines = (value: string) =>
  value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

export default function CompanyDashboardPage() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [user, setUser] = useState<StoredUser | null>(null);

  const [listings, setListings] = useState<Listing[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [listingFilter, setListingFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Post form state
  const [posting, setPosting] = useState(emptyPosting);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [mine, apps] = await Promise.all([
        apiFetch<any>("/internships/mine"),
        apiFetch<any>("/applications/company"),
      ]);

      setListings(
        (mine.data as any[]).map((i) => ({
          id: i.id,
          title: i.title,
          track: i.track?.name || "General",
          type: formatWorkMode(i.type),
          stipend: formatStipend(i.stipendAmount ?? 0, i.currency),
          deadline: formatDate(i.deadline),
          applicantsCount: i._count?.applications ?? 0,
          status: i.status,
        }))
      );

      setApplicants(
        (apps.data as any[]).map((a) => ({
          id: a.id,
          internshipId: a.internship?.id || "",
          candidateName: a.fullName,
          candidateEmail: a.email,
          college: a.collegeOrUniversity,
          degree: a.degree,
          role: a.internship?.title || "Internship",
          appliedDate: formatDate(a.createdAt),
          status: a.status,
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
          : "Your dashboard could not be loaded. Please retry."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setUser(getStoredUser());
    void load();
  }, [load]);

  const handleStatusChange = async (appId: string, newStatus: string) => {
    const previous = applicants.find((a) => a.id === appId)?.status;
    if (!previous || previous === newStatus) return;

    setBusyId(appId);
    setNotice(null);
    try {
      await apiFetch(`/applications/${appId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setApplicants((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
      );
      setNotice({
        type: "success",
        text: "Candidate status updated. The candidate has been notified by email.",
      });
    } catch (err: any) {
      setNotice({
        type: "error",
        text: err?.message || "The status could not be updated.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleOpenResume = async (appId: string) => {
    setBusyId(appId);
    setNotice(null);
    // Opened synchronously inside the click so pop-up blockers allow it; filled in below.
    const tab = window.open("", "_blank");
    try {
      // The API checks that this candidate applied to one of our roles, then issues a
      // download link that is valid for 15 minutes.
      const res = await apiFetch<any>(`/applications/${appId}/resume`);
      const url = res.data?.resumeUrl;
      if (!url) throw new Error("No resume is attached to this application.");
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (err: any) {
      tab?.close();
      setNotice({
        type: "error",
        text: err?.message || "The resume could not be opened.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleCreatePosting = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setNotice(null);

    const requirements = splitLines(posting.requirements);
    const skills = splitLines(posting.skills);
    const stipend = parseInt(posting.stipend || "0", 10);

    if (posting.description.trim().length < 50) {
      setFormError("Describe the role in at least 50 characters.");
      return;
    }
    if (requirements.length === 0 || skills.length === 0) {
      setFormError("Add at least one requirement and one skill.");
      return;
    }
    if (!posting.deadline || new Date(posting.deadline).getTime() <= Date.now()) {
      setFormError("Choose an application deadline in the future.");
      return;
    }
    if (Number.isNaN(stipend) || stipend < 0) {
      setFormError("Stipend must be 0 or a positive amount in INR.");
      return;
    }

    setIsPosting(true);
    try {
      await apiFetch("/internships", {
        method: "POST",
        body: JSON.stringify({
          title: posting.title.trim(),
          companyName: user?.organizationName || user?.name || "Company",
          location: posting.location.trim(),
          type: posting.type,
          stipend,
          currency: "INR",
          durationMonths: parseInt(posting.durationMonths, 10) || 3,
          description: posting.description.trim(),
          whatYouWillDo: [],
          requirements,
          skills,
          openings: parseInt(posting.openings, 10) || 1,
          // Applications stay open until the end of the chosen day (UTC).
          deadline: new Date(`${posting.deadline}T23:59:59.000Z`).toISOString(),
        }),
      });

      setPosting(emptyPosting);
      setNotice({
        type: "success",
        text: "Internship submitted. It goes live once the ByteHUB team approves it.",
      });
      await load();
      setActiveTab("listings");
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        redirectToLogin();
        return;
      }
      setFormError(
        err?.message || "The internship could not be submitted. Please check the form."
      );
    } finally {
      setIsPosting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
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

  const openApplicants = applicants.filter((a) => a.status !== "WITHDRAWN");
  const visibleApplicants =
    listingFilter === "ALL"
      ? applicants
      : applicants.filter((a) => a.internshipId === listingFilter);
  const liveListings = listings.filter((l) => l.status === "PUBLISHED");

  const navItems: NavItem[] = [
    { id: "overview", label: "Overview" },
    {
      id: "applicants",
      label: "Review Applicants",
      ...(openApplicants.length ? { badge: openApplicants.length } : {}),
    },
    { id: "post-job", label: "Post New Internship" },
    {
      id: "listings",
      label: "My Listings",
      ...(listings.length ? { badge: listings.length } : {}),
    },
  ];

  const inputClass = "w-full px-3 py-2 border border-[#D8D3C4] bg-white text-sm";
  const ready = !loading && !loadError;

  return (
    <DashboardLayout
      role="COMPANY"
      title="Company Portal"
      subtitle={
        user?.organizationName
          ? `${user.organizationName} · Listings & Candidate Pipeline`
          : "Manage your posted internship listings, evaluate candidate pipelines, and review resumes."
      }
      navItems={navItems}
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
        <p className="font-mono text-xs text-[#5A574D]">Loading your dashboard...</p>
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
      {/* TAB 1: OVERVIEW                                                     */}
      {/* =================================================================== */}
      {ready && activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[11px] font-mono uppercase text-[#5A574D] block">
                Live Listings
              </span>
              <span className="font-heading text-2xl font-bold mt-1 block">
                {liveListings.length}
              </span>
            </div>
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-4">
              <span className="text-[11px] font-mono uppercase text-[#5A574D] block">
                Total Applicants
              </span>
              <span className="font-heading text-2xl font-bold mt-1 block">
                {openApplicants.length}
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
                Interview / Offered
              </span>
              <span className="font-heading text-2xl font-bold mt-1 block text-[#B8341A]">
                {
                  applicants.filter(
                    (a) => a.status === "INTERVIEW" || a.status === "OFFERED"
                  ).length
                }
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-heading text-lg font-bold">
                Recent Candidate Applications
              </h2>
              <button
                type="button"
                onClick={() => {
                  setListingFilter("ALL");
                  setActiveTab("applicants");
                }}
                className="text-xs text-[#B8341A] font-mono hover:underline"
              >
                View all ({applicants.length}) →
              </button>
            </div>

            {applicants.length === 0 ? (
              <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-6 text-sm text-[#5A574D]">
                No candidates have applied yet. Applications appear here as soon as they
                arrive.
              </div>
            ) : (
              <div className="border border-[#D8D3C4] bg-[#FAF8F3] divide-y divide-[#D8D3C4]">
                {applicants.slice(0, 5).map((app) => (
                  <div
                    key={app.id}
                    className="p-4 sm:flex sm:items-center sm:justify-between space-y-2 sm:space-y-0"
                  >
                    <div>
                      <div className="font-bold text-sm text-[#16150F]">
                        {app.candidateName}
                      </div>
                      <div className="text-xs text-[#5A574D]">
                        {app.role} · {app.college}
                      </div>
                    </div>
                    <div>{getStatusBadge(app.status)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: APPLICANTS PIPELINE                                          */}
      {/* =================================================================== */}
      {ready && activeTab === "applicants" && (
        <div className="space-y-6">
          {listings.length > 0 && (
            <div className="flex items-center gap-3 text-xs">
              <label htmlFor="listing-filter" className="text-[#5A574D]">
                Showing candidates for:
              </label>
              <select
                id="listing-filter"
                value={listingFilter}
                onChange={(e) => setListingFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-[#16150F] bg-white font-mono"
              >
                <option value="ALL">All listings</option>
                {listings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {visibleApplicants.length === 0 ? (
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-6 text-sm text-[#5A574D]">
              No candidates to review here yet.
            </div>
          ) : (
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] divide-y divide-[#D8D3C4]">
              {visibleApplicants.map((app) => (
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

                    {app.status === "WITHDRAWN" ? (
                      <div>{getStatusBadge(app.status)}</div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={`status-${app.id}`}
                          className="text-xs text-[#5A574D]"
                        >
                          Status:
                        </label>
                        <select
                          id={`status-${app.id}`}
                          value={app.status}
                          disabled={busyId === app.id}
                          onChange={(e) => handleStatusChange(app.id, e.target.value)}
                          className="px-2.5 py-1 text-xs border border-[#16150F] bg-white font-mono disabled:opacity-50"
                        >
                          {PIPELINE_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center gap-4 text-xs font-mono">
                    <button
                      type="button"
                      disabled={busyId === app.id}
                      onClick={() => handleOpenResume(app.id)}
                      className="text-[#16150F] hover:text-[#B8341A] underline font-medium disabled:opacity-50"
                    >
                      ↓ Open Resume
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: POST INTERNSHIP FORM                                         */}
      {/* =================================================================== */}
      {ready && activeTab === "post-job" && (
        <div className="max-w-2xl border border-[#D8D3C4] bg-[#FAF8F3] p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="font-heading text-xl font-bold">Post a New Internship</h2>
            <p className="text-xs text-[#5A574D] mt-1">
              New postings are reviewed by the ByteHUB team before they appear on the
              site.
            </p>
          </div>

          {formError && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs"
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleCreatePosting} className="space-y-4 text-xs">
            <div>
              <label
                htmlFor="post-title"
                className="block font-medium mb-1 text-[#16150F]"
              >
                Job Title
              </label>
              <input
                id="post-title"
                type="text"
                required
                minLength={3}
                maxLength={120}
                value={posting.title}
                onChange={(e) => setPosting({ ...posting, title: e.target.value })}
                placeholder="e.g. Backend Developer Intern"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="post-location"
                  className="block font-medium mb-1 text-[#16150F]"
                >
                  Location
                </label>
                <input
                  id="post-location"
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={posting.location}
                  onChange={(e) => setPosting({ ...posting, location: e.target.value })}
                  placeholder="e.g. Bengaluru, India"
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="post-mode"
                  className="block font-medium mb-1 text-[#16150F]"
                >
                  Mode
                </label>
                <select
                  id="post-mode"
                  value={posting.type}
                  onChange={(e) => setPosting({ ...posting, type: e.target.value })}
                  className={inputClass}
                >
                  <option value="REMOTE">Remote</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="ON_SITE">On-site</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="col-span-2">
                <label
                  htmlFor="post-stipend"
                  className="block font-medium mb-1 text-[#16150F]"
                >
                  Monthly Stipend (INR)
                </label>
                <input
                  id="post-stipend"
                  type="number"
                  required
                  min={0}
                  step={1}
                  value={posting.stipend}
                  onChange={(e) => setPosting({ ...posting, stipend: e.target.value })}
                  placeholder="e.g. 35000"
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="post-duration"
                  className="block font-medium mb-1 text-[#16150F]"
                >
                  Months
                </label>
                <input
                  id="post-duration"
                  type="number"
                  required
                  min={1}
                  max={24}
                  value={posting.durationMonths}
                  onChange={(e) =>
                    setPosting({ ...posting, durationMonths: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="post-openings"
                  className="block font-medium mb-1 text-[#16150F]"
                >
                  Openings
                </label>
                <input
                  id="post-openings"
                  type="number"
                  required
                  min={1}
                  value={posting.openings}
                  onChange={(e) => setPosting({ ...posting, openings: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="post-deadline"
                className="block font-medium mb-1 text-[#16150F]"
              >
                Application Deadline
              </label>
              <input
                id="post-deadline"
                type="date"
                required
                value={posting.deadline}
                onChange={(e) => setPosting({ ...posting, deadline: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="post-description"
                className="block font-medium mb-1 text-[#16150F]"
              >
                About the Role (at least 50 characters)
              </label>
              <textarea
                id="post-description"
                required
                rows={4}
                value={posting.description}
                onChange={(e) => setPosting({ ...posting, description: e.target.value })}
                placeholder="What the intern will work on, the team, and what they will learn."
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="post-requirements"
                className="block font-medium mb-1 text-[#16150F]"
              >
                Requirements (one per line)
              </label>
              <textarea
                id="post-requirements"
                required
                rows={3}
                value={posting.requirements}
                onChange={(e) => setPosting({ ...posting, requirements: e.target.value })}
                placeholder={
                  "Strong JavaScript fundamentals\nFamiliar with Git and pull requests"
                }
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="post-skills"
                className="block font-medium mb-1 text-[#16150F]"
              >
                Skills (comma separated)
              </label>
              <input
                id="post-skills"
                type="text"
                required
                value={posting.skills}
                onChange={(e) => setPosting({ ...posting, skills: e.target.value })}
                placeholder="Node.js, PostgreSQL, TypeScript"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={isPosting}
              className="w-full py-3 bg-[#B8341A] text-white font-medium text-xs uppercase tracking-wider hover:bg-[#962B15] transition-colors disabled:opacity-50"
            >
              {isPosting ? "Submitting..." : "Submit Internship for Approval"}
            </button>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: MY LISTINGS                                                  */}
      {/* =================================================================== */}
      {ready && activeTab === "listings" && (
        <div className="space-y-4">
          {listings.length === 0 ? (
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] p-6 text-sm text-[#5A574D]">
              You have not posted an internship yet.
            </div>
          ) : (
            <div className="border border-[#D8D3C4] bg-[#FAF8F3] divide-y divide-[#D8D3C4]">
              {listings.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="font-heading font-bold text-base">{item.title}</h3>
                    <p className="text-xs text-[#5A574D]">
                      {item.track} · {item.type} · Stipend: {item.stipend} · Deadline:{" "}
                      {item.deadline}
                    </p>
                    <p className="text-xs font-mono text-[#B8341A] mt-1">
                      {item.applicantsCount} Total Applicants
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono ${
                        item.status === "PUBLISHED"
                          ? "bg-[#16150F] text-[#F5F2EA]"
                          : "border border-[#D8D3C4] text-[#5A574D]"
                      }`}
                    >
                      {item.status === "DRAFT" ? "AWAITING APPROVAL" : item.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setListingFilter(item.id);
                        setActiveTab("applicants");
                      }}
                      className="px-3 py-1.5 border border-[#16150F] text-xs font-mono hover:bg-[#16150F] hover:text-[#F5F2EA]"
                    >
                      View Applicants
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
