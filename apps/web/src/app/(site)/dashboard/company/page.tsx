"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "../../../../lib/api";
import { siteConfig } from "../../../../lib/siteConfig";

/**
 * Company accounts were retired: ByteHUB now posts every internship and reviews applicants
 * itself. Anyone still signed in with an old company account lands here.
 */
export default function CompanyDashboardRetiredPage() {
  const router = useRouter();

  const signOut = async () => {
    await logout();
    router.push("/companies");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:py-28">
      <div className="hero-reveal space-y-5 border border-editorial-border bg-editorial-surface p-8">
        <p className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
          For companies
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Company accounts are no longer needed
        </h1>
        <p className="text-sm leading-relaxed text-editorial-muted">
          ByteHUB now posts every internship and shortlists applicants for you. Send us
          the role you want to fill and our team will publish it and share the best
          candidates.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/companies#submit-role"
            className="inline-block bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Send us your role
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="border border-ink px-5 py-2.5 text-sm font-semibold hover:bg-ink hover:text-canvas"
          >
            Sign out
          </button>
        </div>
        <p className="text-xs text-editorial-muted">
          Questions about a role you already sent? Write to{" "}
          <a
            href={`mailto:${siteConfig.contact.partnershipsEmail}`}
            className="underline"
          >
            {siteConfig.contact.partnershipsEmail}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
