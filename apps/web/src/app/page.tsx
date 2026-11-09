import Link from "next/link";
import { MOCK_INTERNSHIPS, MOCK_TRAINING_PROGRAMS } from "../lib/mockData";

export default function HomePage() {
  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border border-editorial-border p-8 sm:p-12 md:p-16 bg-canvas">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-editorial-border pb-6 text-xs font-mono uppercase tracking-wider text-editorial-muted">
            <div className="flex items-center gap-3">
              <span className="bg-ink text-canvas px-2 py-0.5 font-bold">BYTEHUB DISPATCH</span>
              <span>VOL. XXIV // ISSUE 01</span>
            </div>
            <div>STATUS: ADMISSIONS & RECRUITMENT ACTIVE</div>
          </div>

          <div className="pt-8 space-y-6 max-w-4xl">
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-ink leading-[1.05]">
              VETTED TECHNICAL INTERNSHIPS. PRODUCTION SYSTEMS TRAINING. ZERO NOISE.
            </h1>
            <p className="font-sans text-base sm:text-lg text-editorial-muted max-w-2xl leading-relaxed">
              ByteHUB connects rigorous engineering students with verified companies. Real compensation, strict technical evaluations, and laboratory training in distributed infrastructure, full-stack architecture, and cloud platforms.
            </p>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <Link
                href="/internships"
                className="border-2 border-ink bg-ink text-canvas hover:bg-transparent hover:text-ink px-6 py-3.5 text-xs font-mono font-bold tracking-widest transition-colors"
              >
                BROWSE INTERNSHIPS [4 ACTIVE]
              </Link>
              <Link
                href="/training"
                className="border border-editorial-border bg-transparent text-ink hover:border-ink px-6 py-3.5 text-xs font-mono font-bold tracking-widest transition-colors"
              >
                EXPLORE TRAINING TRACKS
              </Link>
              <Link
                href="/for-companies"
                className="border border-accent text-accent hover:bg-accent hover:text-canvas px-6 py-3.5 text-xs font-mono font-bold tracking-widest transition-colors"
              >
                FOR EMPLOYERS →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-l border-editorial-border">
          <div className="border-r border-b border-editorial-border p-6 space-y-1">
            <div className="text-xs font-mono text-editorial-muted">[ 01 // METRIC ]</div>
            <div className="font-heading text-3xl font-bold text-ink">100%</div>
            <div className="text-xs font-sans text-editorial-muted">Vetted and verified stipends</div>
          </div>
          <div className="border-r border-b border-editorial-border p-6 space-y-1">
            <div className="text-xs font-mono text-editorial-muted">[ 02 // SCALE ]</div>
            <div className="font-heading text-3xl font-bold text-ink">₹47,000</div>
            <div className="text-xs font-sans text-editorial-muted">Average monthly compensation</div>
          </div>
          <div className="border-r border-b border-editorial-border p-6 space-y-1">
            <div className="text-xs font-mono text-editorial-muted">[ 03 // RIGOR ]</div>
            <div className="font-heading text-3xl font-bold text-ink">1:1</div>
            <div className="text-xs font-sans text-editorial-muted">Direct staff engineer code reviews</div>
          </div>
          <div className="border-r border-b border-editorial-border p-6 space-y-1">
            <div className="text-xs font-mono text-editorial-muted">[ 04 // PAYMENTS ]</div>
            <div className="font-heading text-3xl font-bold text-accent">ACID</div>
            <div className="text-xs font-sans text-editorial-muted">Instant Razorpay & Stripe settlement</div>
          </div>
        </div>
      </section>

      {/* Active Internships Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-editorial-border pb-4">
          <div>
            <span className="text-xs font-mono text-accent font-bold">[ BULLETIN ]</span>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-ink tracking-tight mt-1">
              CURRENTLY OPEN INTERNSHIPS
            </h2>
          </div>
          <Link
            href="/internships"
            className="text-xs font-mono font-bold text-ink hover:text-accent underline underline-offset-4"
          >
            VIEW ALL ROLES →
          </Link>
        </div>

        <div className="border border-editorial-border divide-y divide-editorial-border bg-editorial-surface">
          {MOCK_INTERNSHIPS.map((internship, idx) => (
            <article
              key={internship.id}
              className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center hover:bg-canvas transition-colors"
            >
              <div className="md:col-span-1 font-mono text-xs text-editorial-muted">
                [ 0{idx + 1} ]
              </div>

              <div className="md:col-span-6 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-editorial-muted">
                  <span className="font-bold text-ink uppercase">{internship.companyName}</span>
                  <span>•</span>
                  <span>{internship.location}</span>
                  <span>•</span>
                  <span className="text-accent font-semibold">{internship.type}</span>
                </div>
                <h3 className="font-heading text-xl font-bold text-ink tracking-tight">
                  <Link href={`/internships/${internship.id}`} className="hover:text-accent">
                    {internship.title}
                  </Link>
                </h3>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {internship.skills.map((skill) => (
                    <span
                      key={skill}
                      className="border border-editorial-border bg-white px-2 py-0.5 text-[11px] font-mono text-editorial-muted"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="md:col-span-3 space-y-1 font-mono text-xs">
                <div className="text-editorial-muted">STIPEND:</div>
                <div className="text-sm font-bold text-ink">
                  ₹{internship.stipend.toLocaleString("en-IN")} / mo
                </div>
                <div className="text-[11px] text-editorial-muted">
                  DURATION: {internship.durationMonths} MONTHS
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col items-start md:items-end justify-center">
                <Link
                  href={`/apply/${internship.id}`}
                  className="border border-ink bg-ink text-canvas hover:bg-accent hover:border-accent hover:text-white px-4 py-2 text-xs font-mono font-bold tracking-wider transition-colors w-full sm:w-auto text-center"
                >
                  APPLY NOW
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Paid Training Programs Overview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-editorial-border pb-4">
          <div>
            <span className="text-xs font-mono text-accent font-bold">[ CURRICULUM ]</span>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-ink tracking-tight mt-1">
              PAID TRAINING & LAB TRACKS
            </h2>
          </div>
          <Link
            href="/training"
            className="text-xs font-mono font-bold text-ink hover:text-accent underline underline-offset-4"
          >
            VIEW FULL CURRICULUM SYLLABI →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MOCK_TRAINING_PROGRAMS.map((prog, idx) => (
            <div
              key={prog.id}
              className="border border-editorial-border bg-white p-6 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-mono text-editorial-muted border-b border-editorial-line pb-3">
                  <span>[ TRACK 0{idx + 1} ]</span>
                  <span className="text-accent font-semibold">{prog.seatsLeft} SEATS LEFT</span>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-mono text-editorial-muted uppercase">{prog.track}</div>
                  <h3 className="font-heading text-xl font-bold text-ink">
                    <Link href={`/training/${prog.slug}`} className="hover:text-accent">
                      {prog.title}
                    </Link>
                  </h3>
                </div>

                <p className="text-xs text-editorial-muted leading-relaxed line-clamp-3">
                  {prog.summary}
                </p>

                <div className="border border-editorial-line p-3 space-y-1 text-xs font-mono bg-canvas">
                  <div className="flex justify-between text-editorial-muted">
                    <span>DURATION:</span>
                    <span className="text-ink font-bold">{prog.durationWeeks} WEEKS</span>
                  </div>
                  <div className="flex justify-between text-editorial-muted">
                    <span>START:</span>
                    <span className="text-ink font-bold">{prog.cohortStart}</span>
                  </div>
                  <div className="flex justify-between text-editorial-muted">
                    <span>LEVEL:</span>
                    <span className="text-ink font-bold">{prog.level}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-editorial-border pt-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-editorial-muted">TUITION FEE</div>
                  <div className="font-heading text-lg font-bold text-ink">
                    ₹{prog.priceINR.toLocaleString("en-IN")}{" "}
                    <span className="text-xs font-mono font-normal text-editorial-muted">
                      / ${prog.priceUSD}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/training/${prog.slug}`}
                  className="border border-ink bg-transparent hover:bg-ink hover:text-canvas text-ink px-4 py-2 text-xs font-mono font-bold tracking-wider transition-colors"
                >
                  SYLLABUS & ENROLL
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Manifesto / Editorial Standard Comparison */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border border-editorial-border p-8 md:p-12 bg-white space-y-8">
          <div className="space-y-2 border-b border-editorial-border pb-6">
            <span className="text-xs font-mono text-accent font-bold">[ CRITERIA ]</span>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-ink">
              THE BYTEHUB STANDARD // EDITORIAL RIGOR
            </h2>
            <p className="text-xs font-mono text-editorial-muted">
              Why ByteHUB rejects the noisy, gamified paradigm of commodity job boards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-editorial-border">
            <div className="space-y-4 pr-0 md:pr-8">
              <h3 className="text-xs font-mono font-bold tracking-widest text-accent uppercase">
                [ × ] THE CONVENTIONAL EDTECH STATUS QUO
              </h3>
              <ul className="space-y-3 text-xs font-sans text-editorial-muted">
                <li className="flex items-start gap-2">
                  <span className="font-mono text-accent font-bold">―</span>
                  <span>Unpaid or token ₹2,000 "stipends" disguised as certificates of participation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-accent font-bold">―</span>
                  <span>Mass generic resume blasting with zero feedback or structured evaluation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-accent font-bold">―</span>
                  <span>Superficial tutorial rehashes without concurrency, profiling, or ACID guarantees.</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4 pt-6 md:pt-0 pl-0 md:pl-8">
              <h3 className="text-xs font-mono font-bold tracking-widest text-ink uppercase">
                [ ✓ ] THE BYTEHUB PROTOCOL
              </h3>
              <ul className="space-y-3 text-xs font-sans text-ink">
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-ink">―</span>
                  <span><strong>Mandatory Compensation Floor:</strong> All posted internships must meet vetted minimum stipends.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-ink">―</span>
                  <span><strong>4-Step Quality Application:</strong> Verifiable GitHub profiles, technical essays, and candidate integrity check.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-ink">―</span>
                  <span><strong>Production Laboratory Tracks:</strong> Hands-on implementation of Raft consensus, LSM trees, and Next.js App Router architectures.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

