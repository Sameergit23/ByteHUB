"use client";

import { useState } from "react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    department: "ADMISSIONS",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Masthead */}
      <div className="border border-editorial-border p-8 sm:p-12 bg-white space-y-4">
        <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-editorial-muted border-b border-editorial-border pb-3">
          <span>// COMMUNICATIONS DISPATCH</span>
          <span>OPERATIONAL HOURS: 09:00 - 18:00 IST</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-ink">
          BYTEHUB CENTRAL INQUIRY OFFICE
        </h1>
        <p className="font-sans text-xs sm:text-sm text-editorial-muted max-w-2xl leading-relaxed">
          For technical admissions inquiries, corporate partnership verification, or security audit notifications. All messages receive direct evaluation by our operations team.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Form */}
        <div className="md:col-span-7 border border-editorial-border p-8 bg-white space-y-6">
          <div className="border-b border-editorial-border pb-3">
            <span className="text-xs font-mono text-accent font-bold">[ TRANSMIT MESSAGE ]</span>
            <h2 className="font-heading text-xl font-bold text-ink mt-1">DIRECT INQUIRY FORM</h2>
          </div>

          {submitted ? (
            <div className="border border-green-600 bg-green-50 p-6 font-mono text-xs text-green-950 space-y-2">
              <div className="font-bold">[ MESSAGE DISPATCHED SUCCESSFULLY ]</div>
              <p>Your inquiry has been logged in our queue. Expected response within 24 business hours.</p>
              <button
                onClick={() => setSubmitted(false)}
                className="underline font-bold mt-2 inline-block"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-editorial-muted block">FULL NAME *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Saim Ansari"
                  className="w-full border border-editorial-border bg-canvas px-3 py-2 text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-editorial-muted block">EMAIL ADDRESS *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@domain.edu or company.com"
                  className="w-full border border-editorial-border bg-canvas px-3 py-2 text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-editorial-muted block">DEPARTMENT *</label>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full border border-editorial-border bg-canvas px-3 py-2 text-ink focus:border-ink focus:outline-none"
                >
                  <option value="ADMISSIONS">COHORT ADMISSIONS & LABS</option>
                  <option value="PARTNERSHIP">COMPANY PARTNERSHIPS & HIRING</option>
                  <option value="SECURITY">VULNERABILITY & SECURITY DISCLOSURE</option>
                  <option value="GENERAL">GENERAL INQUIRY</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-editorial-muted block">MESSAGE / SPECIFICATION *</label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Provide detailed context regarding your request..."
                  className="w-full border border-editorial-border bg-canvas p-3 text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full border border-ink bg-ink text-canvas hover:bg-accent hover:border-accent hover:text-white py-3 font-bold tracking-widest transition-colors"
              >
                SUBMIT INQUIRY →
              </button>
            </form>
          )}
        </div>

        {/* Channels sidebar */}
        <div className="md:col-span-5 space-y-6 font-mono text-xs">
          <div className="border border-editorial-border p-6 bg-editorial-surface space-y-4">
            <h3 className="font-bold uppercase tracking-wider text-editorial-muted border-b border-editorial-border pb-2">
              [ DIRECT CHANNELS ]
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-editorial-muted block text-[10px]">ADMISSIONS DESK:</span>
                <span className="text-ink font-semibold">admissions@bytehub.io</span>
              </div>
              <div>
                <span className="text-editorial-muted block text-[10px]">EMPLOYER RELATIONS:</span>
                <span className="text-ink font-semibold">partners@bytehub.io</span>
              </div>
              <div>
                <span className="text-editorial-muted block text-[10px]">SECURITY AUDITING:</span>
                <span className="text-ink font-semibold">security@bytehub.io</span>
              </div>
            </div>
          </div>

          <div className="border border-editorial-border p-6 bg-white space-y-3">
            <h3 className="font-bold uppercase tracking-wider text-editorial-muted border-b border-editorial-border pb-2">
              [ PHYSICAL HEADQUARTERS ]
            </h3>
            <div className="text-editorial-muted leading-relaxed text-[11px]">
              <p className="font-bold text-ink">BYTEHUB LABS PRIVATE LIMITED</p>
              <p>Level 4, Systems Park, Indiranagar</p>
              <p>Bengaluru, Karnataka 560038, India</p>
            </div>
            <div className="pt-2 text-[10px] text-accent font-bold">
              PGP FINGERPRINT: 4B91 A32F 9182 CC71 00E2
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

