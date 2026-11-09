import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "../../components/ui/Card";
import { ColophonFooter } from "../../components/layout/ColophonFooter";
import { MOCK_TRAINING_PROGRAMS } from "../../lib/mockData";

export const metadata: Metadata = {
  title: "Training Programmes — ByteHUB",
  description: "Pick a track, learn in cohorts, finish with a project.",
  openGraph: {
    title: "Training Programmes — ByteHUB",
    description: "Pick a track, learn in cohorts, finish with a project.",
    url: "https://bytehub.io/training",
  },
};

export default function TrainingPage({
  searchParams,
}: {
  searchParams?: {
    track?: string;
  };
}) {
  const selectedTrack = searchParams?.track || "All";

  const categories = ["All", "Web", "App", "Data & AI", "Design"] as const;

  const filtered = MOCK_TRAINING_PROGRAMS.filter((prog) => {
    if (selectedTrack === "All") return true;
    return prog.trackCategory === selectedTrack;
  });

  return (
    <div className="w-full bg-canvas min-h-screen py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Matching Image 5 */}
        <div className="space-y-3">
          <p className="text-xs sm:text-sm font-sans font-semibold text-accent tracking-normal">
            Training
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-ink">
            Programmes
          </h1>
          <p className="font-sans text-sm sm:text-base text-editorial-muted max-w-2xl leading-relaxed">
            Pick a track, learn in cohorts, finish with a project.
          </p>
        </div>

        {/* Filter Pills Matching Image 5 */}
        <nav
          aria-label="Filter training programmes by track"
          className="flex flex-wrap items-center gap-2 pt-2"
        >
          {categories.map((cat) => {
            const isActive = selectedTrack === cat;
            return (
              <Link
                key={cat}
                href={cat === "All" ? "/training" : `/training?track=${encodeURIComponent(cat)}`}
                className={`min-h-[44px] px-4 py-2 text-xs font-sans font-semibold border transition-colors inline-flex items-center justify-center ${
                  isActive
                    ? "bg-[#16150F] text-white border-[#16150F]"
                    : "bg-white text-ink border-editorial-border hover:border-ink"
                }`}
              >
                {cat}
              </Link>
            );
          })}
        </nav>

        {/* 6 Grid Cards Matching Image 5 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {filtered.map((prog) => (
            <Card
              key={prog.id}
              padding="lg"
              className="flex flex-col justify-between space-y-6 hover:border-ink transition-colors"
            >
              <div className="space-y-3">
                {/* [MODE] tag matching Image 5 */}
                <div>
                  <span className="inline-block border border-editorial-border bg-white px-2 py-0.5 text-[11px] font-mono text-editorial-muted">
                    {prog.mode}
                  </span>
                </div>

                <h2 className="font-heading text-xl font-bold text-ink">
                  <Link href={`/training/${prog.slug}`} className="hover:text-accent">
                    {prog.title}
                  </Link>
                </h2>

                <p className="font-mono text-xs text-editorial-muted">
                  {prog.weeks} weeks · {prog.fee}
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href={`/training/${prog.slug}`}
                  className="font-sans text-xs font-semibold text-ink hover:text-accent underline underline-offset-4"
                >
                  View programme →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Colophon Footer Matching Image 5 */}
      <ColophonFooter className="mt-20" />
    </div>
  );
}
