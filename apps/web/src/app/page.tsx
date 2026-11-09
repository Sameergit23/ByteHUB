import Link from "next/link";
import { Button } from "../components/ui/Button";
import { Card, CardTitle } from "../components/ui/Card";

export default function HomePage() {
  const tracks = [
    {
      num: "01",
      title: "Web Development",
      description: "HTML to full-stack, built on real projects.",
      href: "/training/production-fullstack-typescript",
    },
    {
      num: "02",
      title: "App Development",
      description: "Ship a mobile app from idea to store.",
      href: "/training/systems-and-distributed-computing",
    },
    {
      num: "03",
      title: "Data & AI",
      description: "Python, analytics and applied machine learning.",
      href: "/training/cloud-native-devops-and-k8s",
    },
    {
      num: "04",
      title: "UI/UX Design",
      description: "Research, wireframes and polished interfaces.",
      href: "/training",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Pick a track",
      description: "Choose a training path that matches your goal.",
    },
    {
      num: "02",
      title: "Train with mentors",
      description: "Live sessions, assignments and code reviews.",
    },
    {
      num: "03",
      title: "Intern on live work",
      description: "Apply your skills to a real project and earn a certificate.",
    },
  ];

  return (
    <div className="w-full bg-canvas">
      {/* Hero Section Matching Image 1 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Eyebrow, Main Heading, Lead text, Buttons */}
          <div className="lg:col-span-7 space-y-6">
            <p className="text-xs sm:text-sm font-sans font-semibold text-accent tracking-normal">
              Internships and training for students
            </p>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-ink leading-[1.08]">
              Real projects. Real mentors. Your first step into tech.
            </h1>

            <p className="font-sans text-base sm:text-lg text-editorial-muted max-w-xl leading-relaxed">
              Learn a skill in a guided training programme, then prove it on a live internship project.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link href="/internships">
                <Button variant="primary" size="md">
                  Browse internships
                </Button>
              </Link>
              <Link href="/training">
                <Button variant="outline" size="md">
                  Explore training
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column: Next Cohort Box Matching Image 1 */}
          <div className="lg:col-span-5 flex justify-start lg:justify-end">
            <Card padding="lg" className="w-full max-w-md space-y-6">
              <CardTitle>Next cohort</CardTitle>

              <div className="divide-y divide-editorial-line font-mono text-xs">
                <div className="py-3 flex justify-between items-center">
                  <span className="text-editorial-muted">Start date</span>
                  <span className="text-ink font-bold">[DATE]</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-editorial-muted">Duration</span>
                  <span className="text-ink font-bold">[WEEKS]</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-editorial-muted">Mode</span>
                  <span className="text-ink font-bold">[REMOTE / ON-SITE]</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-editorial-muted">Seats left</span>
                  <span className="text-ink font-bold">[NUMBER]</span>
                </div>
              </div>

              <Link href="/training" className="block w-full">
                <Button variant="primary" fullWidth size="md">
                  Reserve a seat
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* Thin 1px divider across full width matching Image 1 */}
      <hr className="border-t border-editorial-border" />

      {/* Section: Choose your track Matching Image 1 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-10">
        <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-ink">
          Choose your track
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tracks.map((track) => (
            <Card
              key={track.num}
              padding="lg"
              className="flex flex-col justify-between space-y-8 hover:border-ink transition-colors"
            >
              <div className="space-y-4">
                <span className="font-mono text-xs font-bold text-accent block">
                  {track.num}
                </span>
                <h3 className="font-heading text-xl font-bold text-ink">
                  {track.title}
                </h3>
                <p className="font-sans text-xs sm:text-sm text-editorial-muted leading-relaxed">
                  {track.description}
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href={track.href}
                  className="font-sans text-xs font-semibold text-ink hover:text-accent underline underline-offset-4"
                >
                  View track →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Thin 1px divider across full width matching Image 1 */}
      <hr className="border-t border-editorial-border" />

      {/* Section: How it works Matching Image 1 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-12">
        <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-ink">
          How it works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step) => (
            <div key={step.num} className="border-t-2 border-ink pt-6 space-y-3">
              <span className="font-mono text-xs font-bold text-accent block">
                {step.num}
              </span>
              <h3 className="font-heading text-lg font-bold text-ink">
                {step.title}
              </h3>
              <p className="font-sans text-xs sm:text-sm text-editorial-muted leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
