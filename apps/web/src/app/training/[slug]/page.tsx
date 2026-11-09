import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip } from "../../../components/ui/Chip";
import { Button } from "../../../components/ui/Button";
import { Card, CardTitle } from "../../../components/ui/Card";
import { ColophonFooter } from "../../../components/layout/ColophonFooter";
import { CourseJsonLd } from "../../../components/seo/CourseJsonLd";
import { MOCK_TRAINING_PROGRAMS } from "../../../lib/mockData";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const program = MOCK_TRAINING_PROGRAMS.find(
    (item) => item.slug === params.slug || item.id === params.slug
  );

  if (!program) {
    return { title: "Programme Not Found — ByteHUB" };
  }

  return {
    title: `${program.title} — ByteHUB`,
    description: program.description,
    openGraph: {
      title: `${program.title} — ByteHUB`,
      description: program.description,
      url: `https://bytehub.io/training/${program.slug}`,
      siteName: "ByteHUB",
      type: "article",
    },
  };
}

export default function TrainingDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const program = MOCK_TRAINING_PROGRAMS.find(
    (item) => item.slug === params.slug || item.id === params.slug
  );

  if (!program) {
    return notFound();
  }

  return (
    <div className="w-full bg-canvas min-h-screen py-12 sm:py-16">
      {/* Schema.org Course Structured Data */}
      <CourseJsonLd
        course={{
          name: program.title,
          description: program.description,
          provider: {
            name: "ByteHUB",
            sameAs: "https://bytehub.io",
          },
          courseCode: program.id,
          hasCourseInstance: {
            courseMode: program.mode.toLowerCase().includes("remote") ? "online" : "onsite",
            duration: `P${program.weeks}W`,
            startDate: "2026-12-01",
          },
          offers: {
            price: 24000,
            priceCurrency: "INR",
            availability: "https://schema.org/InStock",
          },
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header Eyebrow & Title Matching Image 4 / Detail Pattern */}
        <div className="space-y-4">
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

            {/* Syllabus */}
            <div className="space-y-4">
              <h2 className="font-heading text-2xl font-bold text-ink">
                Syllabus
              </h2>
              <div className="divide-y divide-editorial-line border-t border-b border-editorial-line">
                {program.syllabus.map((item) => (
                  <div key={item.week} className="py-4 space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-accent">
                        Week 0{item.week}
                      </span>
                      <h3 className="font-heading font-bold text-base text-ink">
                        {item.title}
                      </h3>
                    </div>
                    <p className="font-sans text-sm text-editorial-muted pl-14">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Prerequisites */}
            <div className="space-y-4">
              <h2 className="font-heading text-2xl font-bold text-ink">
                Prerequisites
              </h2>
              <ul className="space-y-2.5 font-sans text-sm sm:text-base text-ink">
                {program.prerequisites.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="text-accent font-bold select-none">•</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: Sticky Enrol Card on Desktop Matching Image 4 */}
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
                  <span className="text-ink font-bold">{program.fee}</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-editorial-muted">Seats left</span>
                  <span className="text-ink font-bold">{program.seatsLeft}</span>
                </div>
              </div>

              <Link href={`/apply/${program.id}?type=training`} className="block w-full">
                <Button variant="primary" fullWidth size="md">
                  Enrol now
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar on Mobile (< lg) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-editorial-border p-4 shadow-lg flex items-center justify-between gap-4">
        <div>
          <div className="font-heading font-bold text-sm text-ink truncate max-w-[180px]">
            {program.title}
          </div>
          <div className="font-mono text-xs text-editorial-muted">
            {program.fee} · {program.weeks} weeks
          </div>
        </div>
        <Link href={`/apply/${program.id}?type=training`} className="flex-shrink-0">
          <Button variant="primary" size="sm">
            Enrol now
          </Button>
        </Link>
      </div>

      {/* Colophon Footer Matching Image 5 */}
      <ColophonFooter className="mt-20" />
    </div>
  );
}
