import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip } from "../../../components/ui/Chip";
import { Button } from "../../../components/ui/Button";
import { Card, CardTitle } from "../../../components/ui/Card";
import { ColophonFooter } from "../../../components/layout/ColophonFooter";
import { JobPostingJsonLd } from "../../../components/seo/JobPostingJsonLd";
import { getInternship } from "../../../lib/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const internship = await getInternship((await params).id).catch(() => null);

  if (!internship) {
    return { title: "Internship Not Found — ByteHUB" };
  }

  return {
    title: `${internship.title} — ByteHUB`,
    description: internship.aboutRole,
    openGraph: {
      title: `${internship.title} — ByteHUB`,
      description: internship.aboutRole,
      url: `https://bytehub.io/internships/${internship.slug}`,
      siteName: "ByteHUB",
      type: "article",
    },
  };
}

export default async function InternshipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const internship = await getInternship((await params).id);

  if (!internship) {
    return notFound();
  }

  return (
    <div className="w-full bg-canvas min-h-screen py-12 sm:py-16">
      {/* Schema.org JobPosting Structured Data */}
      <JobPostingJsonLd
        job={{
          title: internship.title,
          description: internship.aboutRole,
          datePosted: internship.postedIso.slice(0, 10),
          validThrough: internship.deadlineIso.slice(0, 10),
          employmentType: "INTERN",
          hiringOrganization: {
            name: internship.companyName,
          },
          jobLocation: {
            addressLocality: internship.location,
            addressCountry: "IN",
          },
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header Eyebrow & Title Matching Image 4 */}
        <div className="space-y-4">
          <p className="text-xs sm:text-sm font-sans font-semibold text-accent tracking-normal">
            Internship
          </p>

          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-ink">
            {internship.title}
          </h1>

          {/* Chips Row Matching Image 4 */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Chip label={internship.track} />
            <Chip label={internship.type} />
          </div>
        </div>

        {/* Two-Column Grid: Content on Left, Sticky Card on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Role Details Matching Image 4 */}
          <div className="lg:col-span-7 space-y-10">
            {/* About the role */}
            <div className="space-y-3">
              <h2 className="font-heading text-2xl font-bold text-ink">About the role</h2>
              <p className="font-sans text-sm sm:text-base text-editorial-muted leading-relaxed">
                {internship.aboutRole}
              </p>
            </div>

            {/* What you will do */}
            <div className="space-y-4">
              <h2 className="font-heading text-2xl font-bold text-ink">
                What you will do
              </h2>
              <ul className="space-y-2.5 font-sans text-sm sm:text-base text-ink">
                {internship.whatYouWillDo.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="text-accent font-bold select-none">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Requirements */}
            <div className="space-y-4">
              <h2 className="font-heading text-2xl font-bold text-ink">Requirements</h2>
              <ul className="space-y-2.5 font-sans text-sm sm:text-base text-ink">
                {internship.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="text-accent font-bold select-none">•</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: Sticky Apply Card on Desktop Matching Image 4 */}
          <div className="hidden lg:block lg:col-span-5 sticky top-28">
            <Card padding="lg" className="space-y-6">
              <CardTitle>Apply for this role</CardTitle>

              <div className="divide-y divide-editorial-line font-mono text-xs">
                <div className="py-3 flex justify-between items-center">
                  <span className="text-editorial-muted">Deadline</span>
                  <span className="text-ink font-bold">{internship.deadline}</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-editorial-muted">Duration</span>
                  <span className="text-ink font-bold">{internship.duration}</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-editorial-muted">Mode</span>
                  <span className="text-ink font-bold">{internship.type}</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-editorial-muted">Stipend</span>
                  <span className="text-ink font-bold">{internship.stipend}</span>
                </div>
              </div>

              {internship.isOpen ? (
                <Link href={`/apply/${internship.slug}`} className="block w-full">
                  <Button variant="primary" fullWidth size="md">
                    Apply now
                  </Button>
                </Link>
              ) : (
                <Button variant="primary" fullWidth size="md" disabled>
                  Applications closed
                </Button>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar on Mobile (< md) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-editorial-border p-4 shadow-lg flex items-center justify-between gap-4">
        <div>
          <div className="font-heading font-bold text-sm text-ink truncate max-w-[180px]">
            {internship.title}
          </div>
          <div className="font-mono text-xs text-editorial-muted">
            {internship.stipend}
          </div>
        </div>
        {internship.isOpen ? (
          <Link href={`/apply/${internship.slug}`} className="flex-shrink-0">
            <Button variant="primary" size="sm">
              Apply now
            </Button>
          </Link>
        ) : (
          <Button variant="primary" size="sm" disabled className="flex-shrink-0">
            Closed
          </Button>
        )}
      </div>

      {/* Colophon Footer Matching Image 4 */}
      <ColophonFooter className="mt-20" />
    </div>
  );
}
