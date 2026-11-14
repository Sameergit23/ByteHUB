import type { Metadata } from "next";
import Link from "next/link";
import { Chip } from "../../components/ui/Chip";
import { FormAlert } from "../../components/ui/FormAlert";
import { Button } from "../../components/ui/Button";
import { ColophonFooter } from "../../components/layout/ColophonFooter";
import { getInternships } from "../../lib/catalog";
import { siteConfig } from "../../lib/siteConfig";

export const metadata: Metadata = {
  title: "Open Internships — ByteHUB",
  description:
    "Apply to live projects with mentors. Complete training first to improve your chances.",
  openGraph: {
    title: "Open Internships — ByteHUB",
    description:
      "Apply to live projects with mentors. Complete training first to improve your chances.",
    url: `${siteConfig.siteUrl}/internships`,
  },
};

export default async function InternshipsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{
    search?: string;
    track?: string;
    mode?: string;
    duration?: string;
    page?: string;
  }>;
}) {
  const searchParams = await searchParamsPromise;
  const search = searchParams?.search?.toLowerCase() || "";
  const track = searchParams?.track || "ALL";
  const mode = searchParams?.mode || "ANY";
  const duration = searchParams?.duration || "ANY";

  const internships = await getInternships();
  const isUnavailable = internships === null;
  const allInternships = internships ?? [];

  // Track options come from the live listings, so the filter never offers an empty track.
  const trackOptions = Array.from(
    new Set(allInternships.map((item) => item.track))
  ).sort();

  // Filter driven by URL query params (Server-side rendered, crawlable & shareable)
  const filtered = allInternships.filter((item) => {
    const matchesSearch =
      search === "" ||
      item.title.toLowerCase().includes(search) ||
      item.companyName.toLowerCase().includes(search) ||
      item.track.toLowerCase().includes(search) ||
      item.skills.some((skill) => skill.toLowerCase().includes(search));

    const matchesTrack = track === "ALL" || item.track === track;
    const matchesMode = mode === "ANY" || item.typeCode === mode;
    const matchesDuration =
      duration === "ANY" ||
      (duration === "SHORT" && item.durationMonths <= 2) ||
      (duration === "LONG" && item.durationMonths >= 3);

    return matchesSearch && matchesTrack && matchesMode && matchesDuration;
  });

  return (
    <div className="w-full bg-canvas min-h-screen py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Page Title & Subtitle Matching Image 3 */}
        <div className="hero-reveal space-y-3">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-ink">
            Open internships
          </h1>
          <p className="font-sans text-sm sm:text-base text-editorial-muted max-w-2xl leading-relaxed">
            Apply to live projects with mentors. Complete training first to improve your
            chances.
          </p>
        </div>

        {/* Tabs Matching Image 3 */}
        <div className="border-b border-editorial-border flex items-center gap-8 text-sm font-sans font-semibold">
          <Link
            href="/internships"
            className="py-3 text-ink border-b-2 border-accent font-bold min-h-[44px] inline-flex items-center"
          >
            Internships
          </Link>
          <Link
            href="/training"
            className="py-3 text-editorial-muted hover:text-ink border-b-2 border-transparent transition-colors min-h-[44px] inline-flex items-center"
          >
            Training
          </Link>
        </div>

        {/* Server-side Filter Form (Form GET method updates URL query params) */}
        <form
          method="GET"
          action="/internships"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end"
        >
          <div className="lg:col-span-6 space-y-1.5">
            <label
              htmlFor="search-filter"
              className="block text-xs font-sans font-medium text-ink"
            >
              Search
            </label>
            <input
              id="search-filter"
              name="search"
              type="text"
              defaultValue={searchParams?.search || ""}
              placeholder="Role or skill"
              className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white text-ink border border-editorial-border hover:border-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1"
            />
          </div>

          <div className="lg:col-span-2 space-y-1.5">
            <label
              htmlFor="track-filter"
              className="block text-xs font-sans font-medium text-ink"
            >
              Track
            </label>
            <select
              id="track-filter"
              name="track"
              defaultValue={track}
              className="w-full min-h-[44px] px-3 py-2.5 text-sm bg-white text-ink border border-editorial-border hover:border-ink cursor-pointer focus-visible:outline-2 focus-visible:outline-ink"
            >
              <option value="ALL">All tracks</option>
              {trackOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2 space-y-1.5">
            <label
              htmlFor="mode-filter"
              className="block text-xs font-sans font-medium text-ink"
            >
              Mode
            </label>
            <select
              id="mode-filter"
              name="mode"
              defaultValue={mode}
              className="w-full min-h-[44px] px-3 py-2.5 text-sm bg-white text-ink border border-editorial-border hover:border-ink cursor-pointer focus-visible:outline-2 focus-visible:outline-ink"
            >
              <option value="ANY">Any</option>
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ON_SITE">On-site</option>
            </select>
          </div>

          <div className="lg:col-span-2 space-y-1.5">
            <label
              htmlFor="duration-filter"
              className="block text-xs font-sans font-medium text-ink"
            >
              Duration
            </label>
            <div className="flex gap-2">
              <select
                id="duration-filter"
                name="duration"
                defaultValue={duration}
                className="w-full min-h-[44px] px-3 py-2.5 text-sm bg-white text-ink border border-editorial-border hover:border-ink cursor-pointer focus-visible:outline-2 focus-visible:outline-ink"
              >
                <option value="ANY">Any</option>
                <option value="SHORT">Up to 2 months</option>
                <option value="LONG">3 months or more</option>
              </select>
              <button
                type="submit"
                aria-label="Filter"
                className="min-h-[44px] px-4 bg-ink text-canvas text-xs font-mono font-bold hover:bg-accent transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </form>

        {/* Count Label Matching Image 3 */}
        <div className="font-mono text-xs text-editorial-muted pt-1">
          {filtered.length} open {filtered.length === 1 ? "role" : "roles"}
        </div>

        {isUnavailable && (
          <FormAlert
            alert={{
              kind: "waking",
              title: "Internships couldn't load just now",
              message:
                "Our server may be waking up after a quiet spell. Refresh the page in a few seconds.",
              id: 1,
            }}
          />
        )}

        {!isUnavailable && filtered.length === 0 && (
          <div className="p-6 border border-editorial-border bg-white text-sm text-editorial-muted">
            No internships match these filters.{" "}
            <Link href="/internships" className="text-ink underline underline-offset-4">
              Clear filters
            </Link>
          </div>
        )}

        {/* Tabular Rows Matching Image 3 */}
        <div className="border-t border-editorial-border divide-y divide-editorial-border">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="py-5 sm:py-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center hover:bg-white/40 transition-colors"
            >
              {/* Role Title and Track Chip */}
              <div className="md:col-span-6 space-y-2">
                <h2 className="font-heading text-lg sm:text-xl font-bold text-ink">
                  <Link href={`/internships/${item.slug}`} className="hover:text-accent">
                    {item.title}
                  </Link>
                </h2>
                <div>
                  <Chip label={item.track} />
                </div>
              </div>

              {/* Metadata matching Image 3 */}
              <div className="md:col-span-2 font-mono text-xs text-editorial-muted">
                {item.type}
              </div>

              <div className="md:col-span-1 font-mono text-xs text-editorial-muted">
                {item.duration}
              </div>

              <div className="md:col-span-1 font-mono text-xs text-editorial-muted">
                {item.stipend}
                {item.registrationFeeAmount > 0 && (
                  <span className="block">Fee {item.registrationFee}</span>
                )}
              </div>

              {/* Apply Button */}
              <div className="md:col-span-2 flex justify-start md:justify-end">
                <Link href={`/internships/${item.slug}`}>
                  <Button variant="primary" size="sm" className="w-24">
                    Apply
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Colophon Footer Matching Image 3 / 2 */}
      <ColophonFooter className="mt-20" />
    </div>
  );
}
