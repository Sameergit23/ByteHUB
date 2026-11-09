import Link from "next/link";
import { MOCK_TRAINING_PROGRAMS } from "../../lib/mockData";

export default function TrainingListPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Editorial Header */}
      <div className="border border-editorial-border p-8 sm:p-12 bg-white space-y-4">
        <div className="flex flex-wrap items-center justify-between text-xs font-mono uppercase tracking-widest text-editorial-muted border-b border-editorial-border pb-3">
          <span>// CURRICULUM SYLLABUS DISPATCH</span>
          <span>WINTER / SPRING 2026 COHORTS</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink">
          PAID SYSTEMS TRAINING & ADVANCED LABS
        </h1>
        <p className="font-sans text-xs sm:text-sm text-editorial-muted max-w-3xl leading-relaxed">
          Intensive, laboratory-style cohorts designed for engineers preparing for high-bar platform teams. Live code reviews, production post-mortems, and verifiable deliverables evaluated by principal engineers.
        </p>
      </div>

      {/* Program Grid */}
      <div className="space-y-8">
        {MOCK_TRAINING_PROGRAMS.map((program, idx) => (
          <div
            key={program.id}
            className="border border-editorial-border bg-white p-8 sm:p-10 space-y-6 hover:bg-editorial-surface transition-colors"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-editorial-border pb-4">
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="bg-ink text-canvas px-2 py-0.5 font-bold">[ TRACK 0{idx + 1} ]</span>
                <span className="text-editorial-muted uppercase">{program.track}</span>
              </div>
              <div className="text-xs font-mono text-accent font-bold">
                ● {program.seatsLeft} OF {program.seatsTotal} SEATS REMAINING
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-8 space-y-4">
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-ink">
                  <Link href={`/training/${program.slug}`} className="hover:text-accent transition-colors">
                    {program.title}
                  </Link>
                </h2>
                <p className="text-sm font-sans text-editorial-muted leading-relaxed">
                  {program.summary}
                </p>

                {/* Key Outcomes */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-mono font-bold uppercase text-editorial-muted">
                    KEY ENGINEERING OUTCOMES:
                  </span>
                  <ul className="space-y-1 text-xs font-sans text-ink">
                    {program.outcomes.map((outcome, oIdx) => (
                      <li key={oIdx} className="flex items-center gap-2">
                        <span className="font-mono text-accent font-bold">→</span>
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tools */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-[11px] font-mono text-editorial-muted">TOOLCHAIN:</span>
                  {program.tools.map((tool) => (
                    <span
                      key={tool}
                      className="border border-editorial-border bg-canvas px-2 py-0.5 text-[11px] font-mono text-ink"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sidebar card */}
              <div className="md:col-span-4 border border-editorial-border p-6 bg-canvas space-y-5 font-mono text-xs">
                <div className="space-y-2 border-b border-editorial-line pb-4">
                  <div className="text-[11px] text-editorial-muted">TUITION / REGISTRATION:</div>
                  <div className="font-heading text-2xl font-bold text-ink">
                    ₹{program.priceINR.toLocaleString("en-IN")}{" "}
                    <span className="text-xs font-normal text-editorial-muted">
                      / ${program.priceUSD} USD
                    </span>
                  </div>
                  <div className="text-[10px] text-editorial-muted">
                    INCLUSIVE OF GST & PCI-COMPLIANT GATEWAY VERIFICATION
                  </div>
                </div>

                <div className="space-y-2 text-editorial-muted text-[11px]">
                  <div className="flex justify-between">
                    <span>DURATION:</span>
                    <span className="text-ink font-bold">{program.durationWeeks} WEEKS</span>
                  </div>
                  <div className="flex justify-between">
                    <span>COHORT START:</span>
                    <span className="text-ink font-bold">{program.cohortStart}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DIFFICULTY:</span>
                    <span className="text-ink font-bold">{program.level}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/training/${program.slug}`}
                    className="block text-center border-2 border-ink bg-ink text-canvas hover:bg-accent hover:border-accent hover:text-white py-3 font-bold tracking-wider transition-colors"
                  >
                    VIEW FULL SYLLABUS & ENROLL →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
