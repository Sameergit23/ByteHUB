"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ByteHubLogo } from "../components/brand/ByteHubLogo";
import { Button } from "../components/ui/Button";
import { ColophonFooter } from "../components/layout/ColophonFooter";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected client runtime error
    // eslint-disable-next-line no-console
    console.error("[ByteHUB Runtime Exception]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-between">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 w-full">
        {/* Top Bar */}
        <div className="border-b border-editorial-border pb-6 flex items-center justify-between">
          <Link href="/" className="inline-block">
            <ByteHubLogo variant="light" size="sm" />
          </Link>
          <span className="font-mono text-xs uppercase tracking-widest text-accent font-bold">
            Error 500
          </span>
        </div>

        {/* Fault Information */}
        <div className="hero-reveal py-16 sm:py-24 space-y-6">
          <div className="inline-block border border-accent bg-[#B8341A]/10 text-accent px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider">
            Something went wrong
          </div>

          <h1 className="font-heading text-4xl sm:text-6xl font-bold text-ink tracking-tight leading-none">
            Sorry, this page hit a problem.
          </h1>

          <p className="font-sans text-base sm:text-lg text-editorial-muted max-w-2xl leading-relaxed">
            It wasn't anything you did. Your account and data are safe. Try loading the
            page again; if the problem continues, write to us and mention the reference
            below.
          </p>

          {error.digest && (
            <div className="p-4 border border-editorial-border bg-white font-mono text-xs text-editorial-muted max-w-xl">
              <span className="font-bold text-ink">Reference:</span> {error.digest}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Button variant="primary" size="md" onClick={() => reset()}>
              Try again
            </Button>
            <Link href="/">
              <Button variant="outline" size="md">
                Go to home page
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <ColophonFooter />
    </div>
  );
}
