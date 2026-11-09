import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="border border-editorial-border p-8 sm:p-12 bg-white space-y-4">
        <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-editorial-muted border-b border-editorial-border pb-4">
          <span>// DOCUMENT NO. 01</span>
          <span>THE BYTEHUB MANIFESTO</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink leading-tight">
          A RIGOROUS TALENT INFRASTRUCTURE FOR SYSTEMS AND PRODUCTION SOFTWARE.
        </h1>
        <p className="font-sans text-sm sm:text-base text-editorial-muted leading-relaxed max-w-3xl">
          ByteHUB was founded on a simple observation: modern computer science education is disconnected from how production software is actually written, deployed, and scaled. We exist to eliminate that gap through verifiable work, fair pay, and zero-compromise technical training.
        </p>
      </div>

      {/* Tenets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-editorial-border p-6 bg-canvas space-y-3">
          <div className="font-mono text-xs text-accent font-bold">[ PRINCIPLE 01 ]</div>
          <h2 className="font-heading text-lg font-bold text-ink">COMPENSATION AS RESPECT</h2>
          <p className="text-xs font-sans text-editorial-muted leading-relaxed">
            Unpaid internships are banned from ByteHUB. Engineers write production code that yields enterprise value; paying them is not a courtesy, it is an ethical and economic imperative.
          </p>
        </div>

        <div className="border border-editorial-border p-6 bg-canvas space-y-3">
          <div className="font-mono text-xs text-accent font-bold">[ PRINCIPLE 02 ]</div>
          <h2 className="font-heading text-lg font-bold text-ink">SYSTEMS-FIRST LABS</h2>
          <p className="text-xs font-sans text-editorial-muted leading-relaxed">
            We don't teach toy to-do apps. Our training tracks dissect memory safety, POSIX system calls, write-ahead logs, Raft consensus, and transactional isolation under concurrent load.
          </p>
        </div>

        <div className="border border-editorial-border p-6 bg-canvas space-y-3">
          <div className="font-mono text-xs text-accent font-bold">[ PRINCIPLE 03 ]</div>
          <h2 className="font-heading text-lg font-bold text-ink">PROOF OF WORK</h2>
          <p className="text-xs font-sans text-editorial-muted leading-relaxed">
            Every ByteHUB applicant submits actual code artifacts, architectural breakdowns, and public Git repositories rather than formatted buzzwords on PDFs.
          </p>
        </div>
      </div>

      {/* Editorial Standards Table */}
      <div className="border border-editorial-border bg-white p-8 space-y-6">
        <div className="border-b border-editorial-border pb-4">
          <span className="text-xs font-mono text-editorial-muted uppercase">[ SPECIFICATION ]</span>
          <h2 className="font-heading text-2xl font-bold text-ink mt-1">
            PLATFORM ARCHITECTURAL SPECIFICATION
          </h2>
        </div>

        <div className="divide-y divide-editorial-border font-mono text-xs">
          <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <span className="text-editorial-muted">FRONTEND STACK</span>
            <span className="sm:col-span-2 text-ink font-semibold">
              Next.js 14 App Router, TypeScript (Strict), Tailwind CSS, WCAG 2.2 AA
            </span>
          </div>
          <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <span className="text-editorial-muted">BACKEND RUNTIME</span>
            <span className="sm:col-span-2 text-ink font-semibold">
              Node.js + Express.js API, Zod Schema Validation, Layered Architecture
            </span>
          </div>
          <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <span className="text-editorial-muted">DATA & TRANSACTIONS</span>
            <span className="sm:col-span-2 text-ink font-semibold">
              PostgreSQL via Prisma ORM with strict ACID transaction isolation
            </span>
          </div>
          <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <span className="text-editorial-muted">PAYMENTS</span>
            <span className="sm:col-span-2 text-ink font-semibold">
              Razorpay (India UPI / Cards / Netbanking) & Stripe (Global Cards)
            </span>
          </div>
          <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <span className="text-editorial-muted">DESIGN PHILOSOPHY</span>
            <span className="sm:col-span-2 text-ink font-semibold">
              Swiss Modernist editorial layout: #F5F2EA, #16150F, #B8341A, square corners, 8px grid
            </span>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-editorial-border">
          <span className="text-xs font-mono text-editorial-muted">BYTEHUB REVISION HASH: b8f912c</span>
          <Link
            href="/internships"
            className="border border-ink bg-ink text-canvas hover:bg-accent hover:border-accent hover:text-white px-4 py-2 text-xs font-mono font-bold tracking-wider transition-colors"
          >
            DISCOVER OPENINGS →
          </Link>
        </div>
      </div>
    </div>
  );
}

