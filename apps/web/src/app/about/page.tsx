import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ColophonFooter } from "../../components/layout/ColophonFooter";

export const metadata: Metadata = {
  title: "About Us — ByteHUB",
  description:
    "We help students become working developers. [YOUR BRAND] pairs structured training with live internship projects.",
  openGraph: {
    title: "About Us — ByteHUB",
    description:
      "We help students become working developers. [YOUR BRAND] pairs structured training with live internship projects.",
    url: "https://bytehub.io/about",
    siteName: "ByteHUB",
  },
};

export default function AboutPage() {
  const valueCards = [
    {
      title: "Learn by building",
      description: "Every programme ends with a project you can show.",
    },
    {
      title: "Mentors who work in the field",
      description: "Sessions and reviews from active developers.",
    },
    {
      title: "A clear path to work",
      description: "Training leads into internship interviews.",
    },
  ];

  const team = [
    { name: "[NAME]", role: "[ROLE]" },
    { name: "[NAME]", role: "[ROLE]" },
    { name: "[NAME]", role: "[ROLE]" },
    { name: "[NAME]", role: "[ROLE]" },
  ];

  return (
    <div className="w-full bg-canvas min-h-screen">
      {/* 1. Hero & Value Cards Matching Image 2 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24 space-y-12">
        <div className="space-y-4 max-w-3xl">
          <p className="text-xs sm:text-sm font-sans font-semibold text-accent tracking-normal">
            About us
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-ink leading-[1.08]">
            We help students become working developers.
          </h1>
          <p className="font-sans text-base sm:text-lg text-editorial-muted leading-relaxed">
            [YOUR BRAND] pairs structured training with live internship projects.
          </p>
        </div>

        {/* 3 Value Cards in a row matching Image 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {valueCards.map((card, idx) => (
            <Card key={idx} padding="lg" className="space-y-3">
              <h3 className="font-heading text-lg font-bold text-ink">
                {card.title}
              </h3>
              <p className="font-sans text-xs sm:text-sm text-editorial-muted leading-relaxed">
                {card.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Horizontal divider */}
      <hr className="border-t border-editorial-border" />

      {/* 2. Our Team Section Matching Image 2 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24 space-y-10">
        <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-ink">
          Our team
        </h2>

        {/* 4 Team Cards Matching Image 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {team.map((member, idx) => (
            <div
              key={idx}
              className="border border-editorial-border bg-white flex flex-col"
            >
              {/* Gray placeholder image box matching Image 2 */}
              <div
                className="w-full aspect-[4/3] bg-[#D8D3C4] border-b border-editorial-border"
                aria-hidden="true"
              />
              <div className="p-4 sm:p-5 space-y-1 bg-white">
                <div className="font-heading font-bold text-sm text-ink">
                  {member.name}
                </div>
                <div className="font-mono text-xs text-editorial-muted">
                  {member.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Final Apply Banner Matching Image 2 */}
      <section className="w-full bg-[#16150F] text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">
            Start with one application.
          </h2>
          <Link href="/internships">
            <Button variant="primary" size="md">
              Apply now
            </Button>
          </Link>
        </div>
      </section>

      {/* 4. Minimal Colophon Footer Matching Image 2 */}
      <ColophonFooter />
    </div>
  );
}
