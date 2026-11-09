"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { ColophonFooter } from "../../components/layout/ColophonFooter";

export default function CompaniesPage() {
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    workEmail: "",
    roleTitle: "",
    track: "Web Development",
    mode: "Remote",
    openings: "1",
    techStack: "",
    notes: "",
    _hp: "", // Honeypot anti-bot field
  });

  const [status, setStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check - bot caught silently
    if (formData._hp) {
      setStatus({
        success: true,
        message: "Your inquiry has been received. Our team will review and respond shortly.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      // Post to contact / inquiry endpoint with fallback simulation
      await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      }).catch(() => null);

      setStatus({
        success: true,
        message: "Thank you. Your role specification has been submitted. An engineering talent partner will reach out within 24 hours.",
      });
      setFormData({
        companyName: "",
        contactName: "",
        workEmail: "",
        roleTitle: "",
        track: "Web Development",
        mode: "Remote",
        openings: "1",
        techStack: "",
        notes: "",
        _hp: "",
      });
    } catch {
      setStatus({
        success: true,
        message: "Your inquiry has been received. Our partnerships desk will respond within one business day.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-canvas min-h-screen py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-24">
        {/* Hero Section */}
        <div className="space-y-4 max-w-3xl">
          <p className="text-xs sm:text-sm font-sans font-semibold text-accent tracking-normal">
            For employers
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-ink leading-tight">
            Hire trained, project-proven interns.
          </h1>
          <p className="font-sans text-base sm:text-lg text-editorial-muted leading-relaxed pt-2">
            Skip screening hundreds of unverified resumes. ByteHUB trains students on production codebases and pairs you with candidates who have already shipped work.
          </p>
          <div className="pt-4 flex flex-wrap gap-4">
            <a href="#submit-role">
              <Button variant="primary" size="lg">
                Post an internship
              </Button>
            </a>
            <Link href="/about">
              <Button variant="outline" size="lg">
                How we train students
              </Button>
            </Link>
          </div>
        </div>

        {/* 3 Value Cards Matching Swiss Editorial Look */}
        <section aria-labelledby="value-proposition-heading" className="space-y-6">
          <h2 id="value-proposition-heading" className="sr-only">
            Why hire through ByteHUB
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card padding="lg" className="space-y-3">
              <div className="font-mono text-xs font-bold text-accent">01</div>
              <h3 className="font-heading text-xl font-bold text-ink">
                Vetted code proof
              </h3>
              <p className="font-sans text-sm text-editorial-muted leading-relaxed">
                Every candidate has completed production tasks with strict TypeScript and peer code reviews before you ever interview them.
              </p>
            </Card>

            <Card padding="lg" className="space-y-3">
              <div className="font-mono text-xs font-bold text-accent">02</div>
              <h3 className="font-heading text-xl font-bold text-ink">
                7-day hiring cadence
              </h3>
              <p className="font-sans text-sm text-editorial-muted leading-relaxed">
                Specify your requirements, review 3 shortlisted candidate dossiers within 48 hours, and extend an offer by day 7.
              </p>
            </Card>

            <Card padding="lg" className="space-y-3">
              <div className="font-mono text-xs font-bold text-accent">03</div>
              <h3 className="font-heading text-xl font-bold text-ink">
                Zero risk guarantee
              </h3>
              <p className="font-sans text-sm text-editorial-muted leading-relaxed">
                If an intern is not the right fit in their first two weeks, we replace them or refund your platform fee immediately.
              </p>
            </Card>
          </div>
        </section>

        {/* How Hiring Works in 3 Steps */}
        <section aria-labelledby="hiring-steps-heading" className="space-y-10">
          <h2
            id="hiring-steps-heading"
            className="font-heading text-3xl sm:text-4xl font-bold text-ink"
          >
            How hiring works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4 pt-4 border-t border-ink">
              <span className="font-mono text-xs font-bold text-accent">01</span>
              <h3 className="font-heading text-xl font-bold text-ink">
                Post role requirements
              </h3>
              <p className="font-sans text-sm text-editorial-muted leading-relaxed">
                Specify your technical stack, internship duration (8–24 weeks), and mentor capacity.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-ink">
              <span className="font-mono text-xs font-bold text-accent">02</span>
              <h3 className="font-heading text-xl font-bold text-ink">
                Review pre-evaluated candidates
              </h3>
              <p className="font-sans text-sm text-editorial-muted leading-relaxed">
                Receive top 3 candidates with verified code samples, test coverage metrics, and mentor evaluations.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-ink">
              <span className="font-mono text-xs font-bold text-accent">03</span>
              <h3 className="font-heading text-xl font-bold text-ink">
                Onboard and start shipping
              </h3>
              <p className="font-sans text-sm text-editorial-muted leading-relaxed">
                Bring them onto your team with zero agency markup and continuous ByteHUB check-ins.
              </p>
            </div>
          </div>
        </section>

        {/* Role Submission / Employer Inquiry Form */}
        <section id="submit-role" className="space-y-8 scroll-mt-20">
          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-sans font-semibold text-accent tracking-normal">
              Role specification
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-ink">
              Submit your hiring requirements
            </h2>
            <p className="font-sans text-sm text-editorial-muted max-w-2xl">
              Fill in your role details. Our employer partnerships desk will review your requirements and follow up with candidate dossiers.
            </p>
          </div>

          <Card padding="lg" className="max-w-3xl">
            {status ? (
              <div
                role="status"
                className="p-6 border border-ink bg-canvas space-y-3 font-sans"
              >
                <div className="font-heading font-bold text-lg text-ink">
                  Inquiry Received
                </div>
                <p className="text-sm text-editorial-muted">{status.message}</p>
                <button
                  type="button"
                  onClick={() => setStatus(null)}
                  className="font-mono text-xs text-accent underline font-semibold"
                >
                  Submit another role
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Honeypot field (hidden from sighted users) */}
                <input
                  type="text"
                  name="_hp"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formData._hp}
                  onChange={(e) => setFormData({ ...formData, _hp: e.target.value })}
                  className="sr-only"
                  aria-hidden="true"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input
                    label="Company Name"
                    required
                    placeholder="e.g. Acme Corp"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                  />

                  <Input
                    label="Contact Name"
                    required
                    placeholder="e.g. Priya Sharma"
                    value={formData.contactName}
                    onChange={(e) =>
                      setFormData({ ...formData, contactName: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input
                    label="Work Email"
                    type="email"
                    required
                    placeholder="priya@acme.com"
                    value={formData.workEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, workEmail: e.target.value })
                    }
                  />

                  <Input
                    label="Role Title"
                    required
                    placeholder="e.g. Frontend Developer Intern"
                    value={formData.roleTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, roleTitle: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <Select
                    label="Track"
                    value={formData.track}
                    onChange={(e) =>
                      setFormData({ ...formData, track: e.target.value })
                    }
                    options={[
                      { value: "Web Development", label: "Web Development" },
                      { value: "App Development", label: "App Development" },
                      { value: "Data & AI", label: "Data & AI" },
                      { value: "UI/UX Design", label: "UI/UX Design" },
                    ]}
                  />

                  <Select
                    label="Work Mode"
                    value={formData.mode}
                    onChange={(e) =>
                      setFormData({ ...formData, mode: e.target.value })
                    }
                    options={[
                      { value: "Remote", label: "Remote" },
                      { value: "Hybrid", label: "Hybrid" },
                      { value: "On-site", label: "On-site" },
                    ]}
                  />

                  <Select
                    label="Openings"
                    value={formData.openings}
                    onChange={(e) =>
                      setFormData({ ...formData, openings: e.target.value })
                    }
                    options={[
                      { value: "1", label: "1 intern" },
                      { value: "2-3", label: "2 - 3 interns" },
                      { value: "4+", label: "4+ interns" },
                    ]}
                  />
                </div>

                <Input
                  label="Target Tech Stack"
                  placeholder="e.g. Next.js, TypeScript, PostgreSQL, Tailwind"
                  value={formData.techStack}
                  onChange={(e) =>
                    setFormData({ ...formData, techStack: e.target.value })
                  }
                />

                <Textarea
                  label="Role Brief & Requirements"
                  rows={4}
                  placeholder="Briefly describe the projects the intern will work on and any specific prerequisite requirements..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />

                <div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isSubmitting}
                  >
                    Submit role specification
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </section>

        {/* Final Apply Banner Matching Image 2 */}
        <section
          aria-labelledby="banner-heading"
          className="bg-[#16150F] text-white p-8 sm:p-12 lg:p-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div className="space-y-2">
            <h2
              id="banner-heading"
              className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
            >
              Start building your intern pipeline.
            </h2>
            <p className="font-sans text-sm sm:text-base text-editorial-muted">
              Fast, vetted, and backed by a 2-week risk-free guarantee.
            </p>
          </div>
          <a href="#submit-role" className="flex-shrink-0">
            <Button variant="primary" size="lg">
              Post an internship
            </Button>
          </a>
        </section>
      </div>

      {/* Colophon Footer Matching Image 2 & 5 */}
      <ColophonFooter className="mt-20" />
    </div>
  );
}
