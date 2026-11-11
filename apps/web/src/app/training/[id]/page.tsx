import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip } from "../../../components/ui/Chip";
import { Button } from "../../../components/ui/Button";
import { Card, CardTitle } from "../../../components/ui/Card";
import { ColophonFooter } from "../../../components/layout/ColophonFooter";
import { CourseJsonLd } from "../../../components/seo/CourseJsonLd";
import { getProgramme } from "../../../lib/catalog";
import { siteConfig } from "../../../lib/siteConfig";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const program = await getProgramme((await params).id).catch(() => null);

  if (!program) {
    return { title: "Programme Not Found — ByteHUB" };
  }

  return {
    title: `${program.title} — ByteHUB`,
    description: program.description,
    openGraph: {
      title: `${program.title} — ByteHUB`,
      description: program.description,
      url: `${siteConfig.siteUrl}/training/${program.slug}`,
      siteName: "ByteHUB",
      type: "article",
    },
  };
}

export default async function TrainingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const program = await getProgramme((await params).id);

  if (!program) {
    return notFound();
  }

  const cohort = program.cohort;
  const canEnrol = !!cohort?.isOpen;
  const enrolHref = cohort ? `/training/checkout/${cohort.id}` : "/training";
  const enrolLabel = !cohort
    ? "No open cohort"
    : cohort.seatsLeft <= 0
      ? "Sold out"
      : "Enrolment closed";

  return (
    <div className="w-full bg-canvas min-h-screen py-12 sm:py-16">
      {/* Schema.org Course Structured Data */}
      <CourseJsonLd
        course={{
          name: program.title,
          description: program.description,
          provider: {
            name: "ByteHUB",
            sameAs: siteConfig.siteUrl,
          },
          courseCode: program.id,
          hasCourseInstance: {
            courseMode: program.mode.toLowerCase().includes("remote")
              ? "online"
              : "onsite",
            duration: `P${cohort ? program.weeks : "0"}W`,
            startDate: cohort ? cohort.startDateIso.slice(0, 10) : "",
          },
          offers: {
            price: cohort ? cohort.priceAmount / 100 : 0,
            priceCurrency: cohort?.currency || "INR",
            availability: canEnrol
              ? "https://schema.org/InStock"
              : "https://schema.org/SoldOut",
          },
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header Eyebrow & Title Matching Image 4 / Detail Pattern */}
        <div className="hero-reveal space-y-4">
          <p className="text-xs sm:text-sm font-sans font-semibold text-accent tracking-normal">
            Training programme
          </p>

          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-ink">
            {program.title}
          </h1>

          {/* Chips Row Matching Image 4 */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Chip label={program.mode} />
            <Chip label={`${program.weeks} weeks`} />
          </div>
        </div>

        {/* Two-Column Grid: Content on Left, Sticky Card on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Programme Details */}
          <div className="lg:col-span-7 space-y-10">
            {/* About the programme */}
            <div className="space-y-3">
              <h2 className="font-heading text-2xl font-bold text-ink">
                About the programme
              </h2>
              <p className="font-sans text-sm sm:text-base text-editorial-muted leading-relaxed">
                {program.description}
              </p>
            </div>

            {/* Curriculum Highlights */}
            <div className="space-y-4">
              <h2 className="font-heading text-2xl font-bold text-ink">
                Curriculum highlights
              </h2>
              <ul className="space-y-2.5 font-sans text-sm sm:text-base text-ink">
                {program.prerequisites.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="text-accent font-bold select-none">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weekly Syllabus Breakdown */}
            <div className="space-y-6">
              <h2 className="font-heading text-2xl font-bold text-ink">Weekly roadmap</h2>
              <div className="space-y-4">
                {program.syllabus.map((week) => (
                  <div
                    key={week.week}
                    className="border border-editorial-border p-5 bg-white space-y-2"
                  >
                    <div className="flex items-center justify-between font-mono text-xs text-editorial-muted">
                      <span>WEEK {week.week}</span>
                      <span className="text-accent uppercase font-bold">
                        DELIVERABLE ATTACHED
                      </span>
                    </div>
                    <h3 className="font-heading font-bold text-base text-ink">
                      {week.title}
                    </h3>
                    <p className="font-sans text-xs sm:text-sm text-editorial-muted leading-relaxed">
                      {week.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Enrol Card on Desktop */}
          <div className="hidden lg:block lg:col-span-5 sticky top-28">
            <Card padding="lg" className="space-y-6">
              <CardTitle>Enrol in this cohort</CardTitle>

              <div className="divide-y divide-editorial-line font-mono text-xs">
                <div className="py-3 flex justify-between items-center">
                  <span className="text-editorial-muted">Start date</span>
                  <span className="text-ink font-bold">{program.startDate}</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-editorial-muted">Duration</span>
                  <span className="text-ink font-bold">{program.weeks} weeks</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-editorial-muted">Mode</span>
                  <span className="text-ink font-bold">{program.mode}</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-editorial-muted">Tuition</span>
                  <span className="text-accent font-bold">{program.fee}</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-editorial-muted">Seats remaining</span>
                  <span className="text-ink font-bold" data-testid="seats-remaining">
                    {program.seatsLeft}
                  </span>
                </div>
              </div>

              {canEnrol ? (
                <Link href={enrolHref} className="block w-full">
                  <Button variant="primary" fullWidth size="md">
                    Enrol now
                  </Button>
                </Link>
              ) : (
                <Button variant="primary" fullWidth size="md" disabled>
                  {enrolLabel}
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
            {program.title}
          </div>
          <div className="font-mono text-xs text-accent font-bold">{program.fee}</div>
        </div>
        {canEnrol ? (
          <Link href={enrolHref} className="flex-shrink-0">
            <Button variant="primary" size="sm">
              Enrol now
            </Button>
          </Link>
        ) : (
          <Button variant="primary" size="sm" disabled className="flex-shrink-0">
            {enrolLabel}
          </Button>
        )}
      </div>

      {/* Colophon Footer Matching Image 4 */}
      <ColophonFooter className="mt-20" />
    </div>
  );
}
