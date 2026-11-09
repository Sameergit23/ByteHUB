import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-editorial-border bg-canvas text-ink pt-16 pb-12 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Editorial Top Manifest */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 border-b border-editorial-border">
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="border border-ink px-1.5 py-0.5 text-xs font-mono font-bold">
                BYTEHUB
              </span>
              <span className="text-xs font-mono text-editorial-muted">
                EDITION // 2026
              </span>
            </div>
            <p className="font-heading text-2xl font-bold tracking-tight text-ink max-w-md">
              A high-precision talent infrastructure for systems engineers, technical founders, and verified companies.
            </p>
            <p className="text-xs font-sans text-editorial-muted max-w-lg leading-relaxed">
              We bridge the delta between university computer science curricula and production infrastructure. Zero puffery, zero gamification, verified compensation, and rigorous technical evaluations.
            </p>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-editorial-muted">
              [ 01 // DIRECTORY ]
            </h4>
            <ul className="space-y-2 text-xs font-mono">
              <li>
                <Link href="/internships" className="hover:text-accent transition-colors">
                  Internships List
                </Link>
              </li>
              <li>
                <Link href="/training" className="hover:text-accent transition-colors">
                  Paid Training Tracks
                </Link>
              </li>
              <li>
                <Link href="/for-companies" className="hover:text-accent transition-colors">
                  For Companies
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-accent transition-colors">
                  Editorial Manifesto
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-accent transition-colors">
                  Contact Office
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-editorial-muted">
              [ 02 // ACCESS ]
            </h4>
            <ul className="space-y-2 text-xs font-mono">
              <li>
                <Link href="/auth?mode=login" className="hover:text-accent transition-colors">
                  Student Sign In
                </Link>
              </li>
              <li>
                <Link href="/auth?mode=signup" className="hover:text-accent transition-colors">
                  Student Enrollment
                </Link>
              </li>
              <li>
                <Link href="/for-companies" className="hover:text-accent transition-colors">
                  Post Internship
                </Link>
              </li>
              <li>
                <Link href="/dashboard/company" className="hover:text-accent transition-colors">
                  Company Console
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-accent transition-colors">
                  Admin System
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-editorial-muted">
              [ 03 // INTEGRITY ]
            </h4>
            <div className="space-y-2 text-[11px] font-mono text-editorial-muted leading-relaxed">
              <p>Razorpay India (UPI / Cards / Netbanking)</p>
              <p>Stripe Global (3D Secure 2 / PCI DSS)</p>
              <p>PostgreSQL ACID Transactions</p>
              <p>WCAG 2.2 AA Accessibility Audited</p>
            </div>
          </div>
        </div>

        {/* Bottom Colophon */}
        <div className="pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs font-mono text-editorial-muted">
          <div>
            © {new Date().getFullYear()} BYTEHUB PLATFORM INC. ALL RIGHTS RESERVED.
          </div>
          <div className="flex items-center gap-6">
            <span>TERMS OF ENGAGEMENT</span>
            <span>PRIVACY DISCLOSURE</span>
            <span className="text-accent font-semibold">SECURITY AUDIT: PASS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

