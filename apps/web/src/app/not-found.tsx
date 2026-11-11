import React from "react";
import Link from "next/link";
import { ByteHubLogo } from "../components/brand/ByteHubLogo";
import { ColophonFooter } from "../components/layout/ColophonFooter";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-between">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 w-full">
        {/* Editorial Top Rule */}
        <div className="border-b border-editorial-border pb-6 flex items-center justify-between">
          <Link href="/" className="inline-block">
            <ByteHubLogo variant="light" size="sm" />
          </Link>
          <span className="font-mono text-xs uppercase tracking-widest text-editorial-muted">
            Error 404
          </span>
        </div>

        {/* Hero Section */}
        <div className="hero-reveal py-16 sm:py-24 space-y-6">
          <div className="inline-block border border-accent bg-[#B8341A]/10 text-accent px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider">
            Page not found
          </div>

          <h1 className="font-heading text-4xl sm:text-6xl font-bold text-ink tracking-tight leading-none">
            We couldn't find that page.
          </h1>

          <p className="font-sans text-base sm:text-lg text-editorial-muted max-w-2xl leading-relaxed">
            The link may be old or mistyped, or the page has moved. These are good places
            to continue:
          </p>

          {/* Quick Directory Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
            <Link
              href="/"
              className="p-5 border border-editorial-border bg-white hover:border-ink hover:shadow-sm transition-all group"
            >
              <div className="font-mono text-[10px] text-editorial-muted uppercase tracking-widest">
                Home
              </div>
              <div className="font-heading font-bold text-base text-ink mt-2 group-hover:text-accent">
                ByteHUB home →
              </div>
              <p className="text-xs text-editorial-muted mt-1">
                Start from the main page.
              </p>
            </Link>

            <Link
              href="/internships"
              className="p-5 border border-editorial-border bg-white hover:border-ink hover:shadow-sm transition-all group"
            >
              <div className="font-mono text-[10px] text-editorial-muted uppercase tracking-widest">
                Internships
              </div>
              <div className="font-heading font-bold text-base text-ink mt-2 group-hover:text-accent">
                Browse internships →
              </div>
              <p className="text-xs text-editorial-muted mt-1">
                Explore open positions with verified stipends.
              </p>
            </Link>

            <Link
              href="/training"
              className="p-5 border border-editorial-border bg-white hover:border-ink hover:shadow-sm transition-all group"
            >
              <div className="font-mono text-[10px] text-editorial-muted uppercase tracking-widest">
                Training
              </div>
              <div className="font-heading font-bold text-base text-ink mt-2 group-hover:text-accent">
                Training programmes →
              </div>
              <p className="text-xs text-editorial-muted mt-1">
                Learn a skill in a live cohort.
              </p>
            </Link>
          </div>
        </div>
      </div>

      <ColophonFooter />
    </div>
  );
}
