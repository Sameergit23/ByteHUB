import Link from "next/link";
import { notFound } from "next/navigation";
import { MOCK_INTERNSHIPS } from "../../../lib/mockData";

export default function InternshipDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const internship = MOCK_INTERNSHIPS.find((item) => item.id === params.id);

  if (!internship) {
    return notFound();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Back Breadcrumb */}
      <div>
        <Link
          href="/internships"
          className="text-xs font-mono text-editorial-muted hover:text-ink inline-flex items-center gap-1"
        >
          ← BACK TO INTERNSHIPS LIST
        </Link>
      </div>

      {/* Main Header Box */}
      <div className="border border-editorial-border p-8 sm:p-12 bg-white space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-editorial-border pb-4 text-xs font-mono text-editorial-muted">
          <div>
            EMPLOYER: <span className="font-bold text-ink uppercase">{internship.companyName}</span>
          </div>
          <div>REFERENCE ID: #{internship.id.toUpperCase()}</div>
        </div>

        <div className="space-y-3">
          <span className="border border-editorial-border px-2 py-0.5 text-xs font-mono text-accent font-semibold">
            {internship.type} ENGAGEMENT
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink">
            {internship.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-editorial-muted pt-2">
            <span>LOCATION: {internship.location}</span>
            <span>•</span>
            <span>DURATION: {internship.durationMonths} MONTHS</span>
            <span>•</span>
            <span>OPENINGS: {internship.openings}</span>
          </div>
        </div>

        {/* Action Header Strip */}
        <div className="border-t border-editorial-border pt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="font-mono">
            <span className="text-xs text-editorial-muted block">GUARANTEED STIPEND RATE:</span>
            <span className="text-2xl font-bold font-heading text-ink">
              ₹{internship.stipend.toLocaleString("en-IN")}{" "}
              <span className="text-xs font-normal text-editorial-muted">/ month</span>
            </span>
          </div>

          <Link
            href={`/apply/${internship.id}`}
            className="border-2 border-accent bg-accent text-white hover:bg-accent-hover px-8 py-3.5 text-xs font-mono font-bold tracking-widest transition-colors"
          >
            SUBMIT APPLICATION NOW →
          </Link>
        </div>
      </div>

      {/* Content Columns */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Main Details Body */}
        <div className="md:col-span-8 space-y-8">
          {/* Overview */}
          <div className="border border-editorial-border p-8 bg-white space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-editorial-muted border-b border-editorial-border pb-3">
              [ 01 // ROLE OVERVIEW & SCOPE ]
            </h2>
            <p className="font-sans text-sm text-ink leading-relaxed">
              {internship.description}
            </p>
          </div>

          {/* Technical Requirements */}
          <div className="border border-editorial-border p-8 bg-white space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-editorial-muted border-b border-editorial-border pb-3">
              [ 02 // TECHNICAL REQUIREMENTS & STANDARDS ]
            </h2>
            <ul className="space-y-3 text-xs font-sans text-ink">
              {internship.requirements.map((req, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="font-mono font-bold text-accent">[0{idx + 1}]</span>
                  <span className="leading-relaxed">{req}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Perks & Benefits */}
          <div className="border border-editorial-border p-8 bg-white space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-editorial-muted border-b border-editorial-border pb-3">
              [ 03 // COMPENSATION & COHORTS PERKS ]
            </h2>
            <ul className="space-y-3 text-xs font-sans text-ink">
              {internship.perks.map((perk, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="font-mono font-bold text-ink">✓</span>
                  <span className="leading-relaxed">{perk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sidebar Information */}
        <div className="md:col-span-4 space-y-6">
          <div className="border border-editorial-border p-6 bg-editorial-surface space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-editorial-muted border-b border-editorial-border pb-2">
              [ REQUIRED COMPETENCIES ]
            </h3>
            <div className="flex flex-wrap gap-2">
              {internship.skills.map((skill) => (
                <span
                  key={skill}
                  className="border border-editorial-border bg-white px-2.5 py-1 text-xs font-mono text-ink"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="border border-editorial-border p-6 bg-white space-y-4 font-mono text-xs">
            <h3 className="font-bold uppercase tracking-wider text-editorial-muted border-b border-editorial-border pb-2">
              [ ADMISSIONS PROTOCOL ]
            </h3>
            <div className="space-y-2 text-editorial-muted">
              <div>
                <span className="text-ink font-semibold">APPLICATION PROCESS:</span>
                <p className="mt-0.5 text-[11px]">4-step technical form, GitHub verification, screening essay.</p>
              </div>
              <div className="pt-2">
                <span className="text-ink font-semibold">FEEDBACK GUARANTEE:</span>
                <p className="mt-0.5 text-[11px]">All applicants receive written notification within 7 business days.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-editorial-border">
              <Link
                href={`/apply/${internship.id}`}
                className="block text-center border border-ink bg-ink text-canvas hover:bg-accent hover:border-accent hover:text-white py-3 font-bold tracking-wider transition-colors"
              >
                PROCEED TO APPLICATION
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
