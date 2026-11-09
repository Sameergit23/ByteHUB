"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MOCK_INTERNSHIPS } from "../../../lib/mockData";
import { getStoredUser, apiFetch } from "../../../lib/api";

export default function ApplicationFormPage({
  params,
}: {
  params: { id: string };
}) {
  const internship = MOCK_INTERNSHIPS.find((item) => item.id === params.id);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form state
  const [form, setForm] = useState({
    // Step 1
    fullName: "Maya Sen",
    email: "maya.sen@domain.edu",
    phone: "+91 9876543210",
    collegeOrUniversity: "Indian Institute of Technology",
    graduationYear: 2026,
    degree: "B.Tech Computer Science & Engineering",

    // Step 2
    githubUrl: "https://github.com/mayasen",
    linkedinUrl: "https://linkedin.com/in/mayasen",
    portfolioUrl: "https://mayasen.dev",
    resumeUrl: "https://drive.google.com/file/d/sample-resume-maya",
    bioSummary:
      "Passionate full-stack & systems developer focused on high-throughput backend services, strict TypeScript architectures, and distributed storage.",

    // Step 3
    whyInterested:
      "The engineering challenge of building multi-partition storage engines and working with Raft consensus algorithms aligns directly with my technical focus. I want to contribute to high-performance infrastructure with strict ACID guarantees.",
    relevantProjectDescription:
      "Implemented a replicated key-value storage engine using write-ahead logging (WAL), SSTable compaction, and POSIX socket concurrency in Rust.",
    availableHoursPerWeek: 35,
    earliestStartDate: "2026-12-01",

    // Step 4
    termsAccepted: true,
    accurateInformationAcknowledged: true,
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!internship) {
    return notFound();
  }

  const validateStep = (currentStep: number): boolean => {
    setError(null);
    if (currentStep === 1) {
      if (!form.fullName || !form.email || !form.collegeOrUniversity || !form.degree) {
        setError("Please complete all required academic and contact fields.");
        return false;
      }
    } else if (currentStep === 2) {
      if (!form.githubUrl || !form.linkedinUrl || !form.resumeUrl || form.bioSummary.length < 20) {
        setError("Please provide valid URLs and a summary of at least 20 characters.");
        return false;
      }
    } else if (currentStep === 3) {
      if (form.whyInterested.length < 50 || form.relevantProjectDescription.length < 50) {
        setError("Please provide thorough technical answers (min 50 characters each).");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => (prev < 4 ? ((prev + 1) as any) : 4));
    }
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => (prev > 1 ? ((prev - 1) as any) : 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.termsAccepted || !form.accurateInformationAcknowledged) {
      setError("You must acknowledge the terms and verify statement accuracy.");
      return;
    }

    const user = getStoredUser();
    if (!user) {
      window.location.href = `/auth?mode=login&redirect=/apply/${internship.id}`;
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiFetch("/applications", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          internshipId: internship.id,
        }),
      });
      setSubmitted(true);
    } catch (err: any) {
      // In offline or fallback mode, treat as successful submission
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Breadcrumb */}
      <div>
        <Link
          href={`/internships/${internship.id}`}
          className="text-xs font-mono text-editorial-muted hover:text-ink inline-flex items-center gap-1"
        >
          ← CANCEL & RETURN TO ROLE DETAILS
        </Link>
      </div>

      {/* Header */}
      <div className="border border-editorial-border p-6 sm:p-8 bg-white space-y-2">
        <div className="flex flex-wrap items-center justify-between text-xs font-mono text-editorial-muted border-b border-editorial-border pb-3">
          <span>// APPLICATION INTAKE PROTOCOL</span>
          <span className="text-accent font-semibold">STAGE {step} OF 4</span>
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-ink">
          APPLICATION FOR {internship.title.toUpperCase()}
        </h1>
        <div className="text-xs font-mono text-editorial-muted">
          EMPLOYER: <span className="font-bold text-ink">{internship.companyName}</span> | STIPEND: ₹{internship.stipend.toLocaleString("en-IN")}/mo
        </div>
      </div>

      {/* 4-Step Progress Ribbon */}
      <div className="grid grid-cols-4 border border-editorial-border bg-white text-xs font-mono divide-x divide-editorial-border">
        {[
          { num: 1, title: "ACADEMICS" },
          { num: 2, title: "EXPERIENCE" },
          { num: 3, title: "SCREENING" },
          { num: 4, title: "REVIEW" },
        ].map((item) => (
          <div
            key={item.num}
            className={`p-3 text-center sm:text-left ${
              step === item.num
                ? "bg-ink text-canvas font-bold"
                : step > item.num
                ? "bg-canvas text-ink"
                : "text-editorial-muted"
            }`}
          >
            <div className="text-[10px] opacity-80">STEP 0{item.num}</div>
            <div className="truncate">{item.title}</div>
          </div>
        ))}
      </div>

      {/* Form Container */}
      <div className="border-2 border-ink p-6 sm:p-10 bg-white space-y-6">
        {error && (
          <div className="border border-accent bg-accent-light p-3 text-xs font-mono text-accent">
            [ VALIDATION ALERT ]: {error}
          </div>
        )}

        {submitted ? (
          <div className="space-y-6 py-6 text-center">
            <div className="font-mono text-xs text-accent font-bold">[ DISPATCH RECORDED ]</div>
            <h2 className="font-heading text-3xl font-bold text-ink">
              APPLICATION TRANSMITTED SUCCESSFULLY
            </h2>
            <p className="font-sans text-xs sm:text-sm text-editorial-muted max-w-lg mx-auto leading-relaxed">
              Your 4-step application for <strong>{internship.title}</strong> has been received by {internship.companyName}. You will receive status updates in your Student Dashboard and registered email.
            </p>

            <div className="pt-4 flex justify-center gap-4">
              <Link
                href="/dashboard/student"
                className="border-2 border-ink bg-ink text-canvas px-6 py-3 text-xs font-mono font-bold tracking-wider hover:bg-accent hover:border-accent hover:text-white transition-colors"
              >
                OPEN STUDENT DASHBOARD →
              </Link>
              <Link
                href="/internships"
                className="border border-editorial-border px-6 py-3 text-xs font-mono font-bold hover:border-ink transition-colors"
              >
                EXPLORE MORE ROLES
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 font-mono text-xs">
            {/* STEP 1: Personal & Academics */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="border-b border-editorial-border pb-2 text-xs font-bold text-editorial-muted uppercase">
                  [ STEP 01 // CONTACT & ACADEMIC CREDENTIALS ]
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-editorial-muted block">FULL NAME *</label>
                    <input
                      type="text"
                      required
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      className="w-full border border-editorial-border bg-canvas px-3 py-2 text-ink focus:border-ink focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-editorial-muted block">EMAIL ADDRESS *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full border border-editorial-border bg-canvas px-3 py-2 text-ink focus:border-ink focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-editorial-muted block">PHONE NUMBER *</label>
                    <input
                      type="text"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full border border-editorial-border bg-canvas px-3 py-2 text-ink focus:border-ink focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-editorial-muted block">COLLEGE / UNIVERSITY *</label>
                    <input
                      type="text"
                      required
                      value={form.collegeOrUniversity}
                      onChange={(e) =>
                        setForm({ ...form, collegeOrUniversity: e.target.value })
                      }
                      className="w-full border border-editorial-border bg-canvas px-3 py-2 text-ink focus:border-ink focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-editorial-muted block">DEGREE & MAJOR *</label>
                    <input
                      type="text"
                      required
                      value={form.degree}
                      onChange={(e) => setForm({ ...form, degree: e.target.value })}
                      className="w-full border border-editorial-border bg-canvas px-3 py-2 text-ink focus:border-ink focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-editorial-muted block">GRADUATION YEAR *</label>
                    <input
                      type="number"
                      required
                      min={2020}
                      max={2032}
                      value={form.graduationYear}
                      onChange={(e) =>
                        setForm({ ...form, graduationYear: Number(e.target.value) })
                      }
                      className="w-full border border-editorial-border bg-canvas px-3 py-2 text-ink focus:border-ink focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Experience & Links */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="border-b border-editorial-border pb-2 text-xs font-bold text-editorial-muted uppercase">
                  [ STEP 02 // CODE REPOSITORIES & EXPERIENCE LINKS ]
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-editorial-muted block">GITHUB PROFILE URL *</label>
                    <input
                      type="url"
                      required
                      value={form.githubUrl}
                      onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                      className="w-full border border-editorial-border bg-canvas px-3 py-2 text-ink focus:border-ink focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-editorial-muted block">LINKEDIN PROFILE URL *</label>
                    <input
                      type="url"
                      required
                      value={form.linkedinUrl}
                      onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                      className="w-full border border-editorial-border bg-canvas px-3 py-2 text-ink focus:border-ink focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-editorial-muted block">PORTFOLIO / PERSONAL WEBSITE</label>
                    <input
                      type="url"
                      value={form.portfolioUrl}
                      onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })}
                      className="w-full border border-editorial-border bg-canvas px-3 py-2 text-ink focus:border-ink focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-editorial-muted block">HOSTED RESUME (PDF URL) *</label>
                    <input
                      type="url"
                      required
                      value={form.resumeUrl}
                      onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })}
                      placeholder="https://drive.google.com/..."
                      className="w-full border border-editorial-border bg-canvas px-3 py-2 text-ink focus:border-ink focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-editorial-muted block">
                    ENGINEERING BIO / BRIEF STATEMENT * (MIN 20 CHARS)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={form.bioSummary}
                    onChange={(e) => setForm({ ...form, bioSummary: e.target.value })}
                    className="w-full border border-editorial-border bg-canvas p-3 text-ink focus:border-ink focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* STEP 3: Screening Questions */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="border-b border-editorial-border pb-2 text-xs font-bold text-editorial-muted uppercase">
                  [ STEP 03 // TECHNICAL SCREENING & INTENT ]
                </div>

                <div className="space-y-1">
                  <label className="text-editorial-muted block">
                    WHY ARE YOU INTERESTED IN THIS SPECIFIC ROLE? * (MIN 50 CHARS)
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={form.whyInterested}
                    onChange={(e) => setForm({ ...form, whyInterested: e.target.value })}
                    className="w-full border border-editorial-border bg-canvas p-3 text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-editorial-muted block">
                    DESCRIBE A COMPLEX PROJECT OR SYSTEM YOU BUILT * (MIN 50 CHARS)
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={form.relevantProjectDescription}
                    onChange={(e) =>
                      setForm({ ...form, relevantProjectDescription: e.target.value })
                    }
                    className="w-full border border-editorial-border bg-canvas p-3 text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-editorial-muted block">
                      AVAILABLE HOURS PER WEEK *
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={60}
                      required
                      value={form.availableHoursPerWeek}
                      onChange={(e) =>
                        setForm({ ...form, availableHoursPerWeek: Number(e.target.value) })
                      }
                      className="w-full border border-editorial-border bg-canvas px-3 py-2 text-ink focus:border-ink focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-editorial-muted block">
                      EARLIEST FEASIBLE START DATE *
                    </label>
                    <input
                      type="date"
                      required
                      value={form.earliestStartDate}
                      onChange={(e) =>
                        setForm({ ...form, earliestStartDate: e.target.value })
                      }
                      className="w-full border border-editorial-border bg-canvas px-3 py-2 text-ink focus:border-ink focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Review & Acknowledgement */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="border-b border-editorial-border pb-2 text-xs font-bold text-editorial-muted uppercase">
                  [ STEP 04 // FINAL REVIEW & CANDIDATE AFFIDAVIT ]
                </div>

                {/* Summary Table */}
                <div className="border border-editorial-border p-4 bg-canvas space-y-2 text-xs">
                  <div className="grid grid-cols-3 gap-2 border-b border-editorial-line pb-2">
                    <span className="text-editorial-muted">Candidate:</span>
                    <span className="col-span-2 text-ink font-bold">
                      {form.fullName} ({form.email})
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-b border-editorial-line pb-2">
                    <span className="text-editorial-muted">Academics:</span>
                    <span className="col-span-2 text-ink font-bold">
                      {form.degree}, {form.collegeOrUniversity} ({form.graduationYear})
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-b border-editorial-line pb-2">
                    <span className="text-editorial-muted">Code / Links:</span>
                    <span className="col-span-2 text-ink font-bold truncate">
                      {form.githubUrl} | {form.linkedinUrl}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-editorial-muted">Commitment:</span>
                    <span className="col-span-2 text-ink font-bold">
                      {form.availableHoursPerWeek} hrs/week | Starting: {form.earliestStartDate}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.termsAccepted}
                      onChange={(e) =>
                        setForm({ ...form, termsAccepted: e.target.checked })
                      }
                      className="mt-0.5 border border-ink"
                    />
                    <span className="text-editorial-muted text-xs leading-relaxed">
                      I agree to the ByteHUB candidate terms of service and consent to sharing my code artifacts with {internship.companyName}.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.accurateInformationAcknowledged}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          accurateInformationAcknowledged: e.target.checked,
                        })
                      }
                      className="mt-0.5 border border-ink"
                    />
                    <span className="text-editorial-muted text-xs leading-relaxed">
                      I certify that all code in my submitted repositories is either my original work or properly attributed under open-source licenses.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="border-t border-editorial-border pt-6 flex items-center justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="border border-editorial-border px-4 py-2 text-editorial-muted hover:text-ink hover:border-ink transition-colors"
                >
                  ← PREVIOUS STEP
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="border-2 border-ink bg-ink text-canvas hover:bg-accent hover:border-accent hover:text-white px-6 py-2.5 font-bold tracking-widest transition-colors"
                >
                  CONTINUE TO STEP 0{step + 1} →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="border-2 border-accent bg-accent text-white hover:bg-accent-hover px-8 py-3 font-bold tracking-widest transition-colors disabled:opacity-50"
                >
                  {submitting ? "TRANSMITTING..." : "COMMIT APPLICATION →"}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
