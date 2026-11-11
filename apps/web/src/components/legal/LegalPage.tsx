import React from "react";
import Link from "next/link";
import { ColophonFooter } from "../layout/ColophonFooter";
import { siteConfig } from "../../lib/siteConfig";

interface LegalPageProps {
  eyebrow: string;
  title: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund & Cancellation" },
];

/** Shared layout for the Terms, Privacy and Refund pages. */
export function LegalPage({ eyebrow, title, intro, children }: LegalPageProps) {
  return (
    <div className="w-full bg-canvas min-h-screen py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {!siteConfig.legal.reviewed && (
          <div
            role="note"
            className="p-4 border border-accent bg-[#FBEBE8] text-accent text-xs font-mono leading-relaxed"
          >
            [ DRAFT ]: This policy is a template that has not been reviewed yet. Details
            in square brackets are placeholders.
          </div>
        )}

        <header className="hero-reveal space-y-3">
          <p className="text-xs sm:text-sm font-sans font-semibold text-accent">
            {eyebrow}
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-ink">
            {title}
          </h1>
          <p className="font-mono text-xs text-editorial-muted">
            Effective {siteConfig.legal.effectiveDate} ·{" "}
            {siteConfig.legal.legalEntityName}
          </p>
          <div className="font-sans text-sm sm:text-base text-editorial-muted leading-relaxed">
            {intro}
          </div>
        </header>

        <nav aria-label="Legal documents" className="flex flex-wrap gap-2">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 border border-editorial-border bg-white text-xs font-sans font-semibold text-ink hover:border-ink min-h-[36px] inline-flex items-center"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="space-y-8 font-sans text-sm text-ink leading-relaxed">
          {children}
        </div>

        <section className="border-t border-editorial-border pt-6 space-y-2 font-sans text-sm text-ink">
          <h2 className="font-heading text-lg font-bold">Contact</h2>
          <p>
            {siteConfig.legal.legalEntityName}
            <br />
            {siteConfig.legal.registeredAddress}
          </p>
          <p>
            Email:{" "}
            <a className="underline" href={`mailto:${siteConfig.contact.supportEmail}`}>
              {siteConfig.contact.supportEmail}
            </a>{" "}
            · Phone: {siteConfig.contact.phone}
          </p>
        </section>
      </div>

      <ColophonFooter className="mt-20" />
    </div>
  );
}

/** A numbered policy section. */
export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-3 scroll-mt-28">
      <h2 className="font-heading text-xl font-bold text-ink">{title}</h2>
      <div className="space-y-3 text-editorial-muted [&_strong]:text-ink [&_a]:underline [&_a]:text-ink">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
