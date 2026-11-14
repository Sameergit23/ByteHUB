"use client";

import React, { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Checkbox } from "../../components/ui/Checkbox";
import { Chip } from "../../components/ui/Chip";
import { Card, CardTitle } from "../../components/ui/Card";
import { Tabs } from "../../components/ui/Tabs";
import { Modal } from "../../components/ui/Modal";
import { Toast } from "../../components/ui/Toast";
import { Table, Column } from "../../components/ui/Table";
import { Pagination } from "../../components/ui/Pagination";
import { Stepper } from "../../components/ui/Stepper";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import {
  ByteHubLogo,
  ByteHubSymbol,
  ByteHubAppIcon,
} from "../../components/brand/ByteHubLogo";

interface DemoInternship {
  id: string;
  role: string;
  track: string;
  mode: string;
  duration: string;
  stipend: string;
}

export default function StyleguidePage() {
  // Interactive state
  const [activeTab, setActiveTab] = useState("internships");
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(
    "ACID Transaction settlement committed. Idempotency verified."
  );
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");
  const [currentPage, setCurrentPage] = useState(1);
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [textInputValue, setTextInputValue] = useState("Role or skill");

  // Sample data matching Image 2
  const sampleInternships: DemoInternship[] = [
    {
      id: "1",
      role: "Frontend Developer Intern",
      track: "Web Development",
      mode: "Hybrid",
      duration: "12 weeks",
      stipend: "₹35,000 / mo",
    },
    {
      id: "2",
      role: "Mobile App Intern",
      track: "App Development",
      mode: "Remote",
      duration: "16 weeks",
      stipend: "₹40,000 / mo",
    },
    {
      id: "3",
      role: "Data Analyst Intern",
      track: "Data & AI",
      mode: "On-site",
      duration: "12 weeks",
      stipend: "₹30,000 / mo",
    },
    {
      id: "4",
      role: "UI/UX Design Intern",
      track: "UI/UX Design",
      mode: "Remote",
      duration: "10 weeks",
      stipend: "₹32,000 / mo",
    },
    {
      id: "5",
      role: "Backend Developer Intern",
      track: "Web Development",
      mode: "Hybrid",
      duration: "16 weeks",
      stipend: "₹45,000 / mo",
    },
  ];

  const tableColumns: Column<DemoInternship>[] = [
    {
      header: "ROLE & TRACK",
      cell: (item) => (
        <div className="space-y-1.5">
          <div className="font-heading font-bold text-base text-ink">{item.role}</div>
          <Chip label={item.track} />
        </div>
      ),
    },
    {
      header: "MODE",
      accessorKey: "mode",
      className: "font-mono text-xs text-editorial-muted",
    },
    {
      header: "DURATION",
      accessorKey: "duration",
      className: "font-mono text-xs text-editorial-muted",
    },
    {
      header: "STIPEND",
      accessorKey: "stipend",
      className: "font-mono text-xs text-editorial-muted",
    },
    {
      header: "ACTION",
      align: "right",
      cell: () => (
        <Button variant="primary" size="sm" className="w-24">
          Apply
        </Button>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Page Title & Standards Header */}
      <div className="border border-editorial-border p-6 sm:p-10 bg-white space-y-4">
        <div className="flex flex-wrap items-center justify-between text-xs font-mono uppercase tracking-widest text-editorial-muted border-b border-editorial-border pb-3">
          <span>// DESIGN SYSTEM ATLAS</span>
          <span>SWISS-EDITORIAL LOOK // WCAG 2.2 AA VERIFIED</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink">
          COMPONENT STYLEGUIDE & FOUNDATION
        </h1>
        <p className="font-sans text-sm sm:text-base text-editorial-muted max-w-3xl leading-relaxed">
          Comprehensive specification of colors, typography, touch targets (≥44px), form
          controls, modal dialogues, interactive tabs, and tables that collapse to cards
          at 360px viewport.
        </p>
      </div>

      {/* 0. Brand Identity: Official Logo in 3 Formats */}
      <section className="space-y-6">
        <div className="border-b border-editorial-border pb-3">
          <h2 className="font-heading text-2xl font-bold text-ink">
            00. BRAND IDENTITY // OFFICIAL LOGO SYSTEM (3 FORMATS)
          </h2>
          <p className="text-xs font-mono text-editorial-muted mt-1">
            Optimized for light surfaces, dark backgrounds, high-DPI viewports, and app
            icons / favicons
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Format 1: Primary Light Logo */}
          <div className="border border-editorial-border bg-white p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-accent font-bold">
                FORMAT 01 // LIGHT SURFACES
              </span>
              <p className="text-xs font-sans text-editorial-muted leading-relaxed">
                Primary horizontal logo with tagline. Used in site headers, footers,
                invoices, and email templates.
              </p>
            </div>
            <div className="py-8 px-4 bg-[#F5F2EA] border border-editorial-border flex items-center justify-center">
              <ByteHubLogo variant="light" size="lg" withTagline />
            </div>
            <div className="text-[11px] font-mono text-editorial-muted">
              Usage: &lt;ByteHubLogo variant=&quot;light&quot; withTagline /&gt;
            </div>
          </div>

          {/* Format 2: Inverted Dark Logo */}
          <div className="border border-editorial-border bg-white p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-accent font-bold">
                FORMAT 02 // DARK SURFACES
              </span>
              <p className="text-xs font-sans text-editorial-muted leading-relaxed">
                Inverted logo with white wordmark &amp; golden-amber &quot;HUB&quot;. Used
                on dark banners, CTAs, and splash screens.
              </p>
            </div>
            <div className="py-8 px-4 bg-[#0A1128] border border-editorial-border flex items-center justify-center">
              <ByteHubLogo variant="dark" size="lg" withTagline />
            </div>
            <div className="text-[11px] font-mono text-editorial-muted">
              Usage: &lt;ByteHubLogo variant=&quot;dark&quot; withTagline /&gt;
            </div>
          </div>

          {/* Format 3: App Icon & Standalone Symbol */}
          <div className="border border-editorial-border bg-white p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-accent font-bold">
                FORMAT 03 // APP ICON &amp; SYMBOL
              </span>
              <p className="text-xs font-sans text-editorial-muted leading-relaxed">
                Squircle app badge and standalone network mark. Used for favicons, mobile
                nav, and PWA icons.
              </p>
            </div>
            <div className="py-8 px-4 bg-[#F5F2EA] border border-editorial-border flex items-center justify-center gap-6">
              <ByteHubAppIcon size={56} />
              <ByteHubSymbol size={52} />
            </div>
            <div className="text-[11px] font-mono text-editorial-muted">
              Usage: &lt;ByteHubAppIcon /&gt; &amp; &lt;ByteHubSymbol /&gt;
            </div>
          </div>
        </div>
      </section>

      {/* 1. Design Tokens: Colors */}
      <section className="space-y-6">
        <div className="border-b border-editorial-border pb-3">
          <h2 className="font-heading text-2xl font-bold text-ink">
            01. DESIGN TOKENS // COLOR PALETTE
          </h2>
          <p className="text-xs font-mono text-editorial-muted mt-1">
            Exact hex values from specification with 4.5:1+ text contrast compliance
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="border border-editorial-border p-4 bg-canvas space-y-2">
            <div className="h-14 border border-editorial-border bg-canvas" />
            <div className="font-heading font-bold text-sm text-ink">CANVAS</div>
            <div className="font-mono text-xs text-editorial-muted">#F5F2EA</div>
            <div className="text-[11px] text-editorial-muted">Warm off-white</div>
          </div>

          <div className="border border-editorial-border p-4 bg-white space-y-2">
            <div className="h-14 bg-ink" />
            <div className="font-heading font-bold text-sm text-ink">INK</div>
            <div className="font-mono text-xs text-editorial-muted">#16150F</div>
            <div className="text-[11px] text-editorial-muted">Near-black text</div>
          </div>

          <div className="border border-editorial-border p-4 bg-white space-y-2">
            <div className="h-14 bg-accent" />
            <div className="font-heading font-bold text-sm text-ink">ACCENT</div>
            <div className="font-mono text-xs text-editorial-muted">#B8341A</div>
            <div className="text-[11px] text-editorial-muted">Swiss vermillion</div>
          </div>

          <div className="border border-editorial-border p-4 bg-white space-y-2">
            <div className="h-14 bg-editorial-muted" />
            <div className="font-heading font-bold text-sm text-ink">MUTED</div>
            <div className="font-mono text-xs text-editorial-muted">#5A574D</div>
            <div className="text-[11px] text-editorial-muted">Secondary text</div>
          </div>

          <div className="border border-editorial-border p-4 bg-white space-y-2">
            <div className="h-14 bg-editorial-border border border-editorial-line" />
            <div className="font-heading font-bold text-sm text-ink">BORDER</div>
            <div className="font-mono text-xs text-editorial-muted">#D8D3C4</div>
            <div className="text-[11px] text-editorial-muted">Thin 1px rules</div>
          </div>
        </div>
      </section>

      {/* 2. Buttons: Primary, Outline, Text */}
      <section className="space-y-6">
        <div className="border-b border-editorial-border pb-3">
          <h2 className="font-heading text-2xl font-bold text-ink">
            02. BUTTONS // REAL BUTTONS (MIN 44PX TOUCH TARGET)
          </h2>
          <p className="text-xs font-mono text-editorial-muted mt-1">
            Solid accent (#B8341A), 1px Outline, and Text variants with visible focus
            rings
          </p>
        </div>

        <div className="border border-editorial-border bg-white p-6 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-editorial-muted">
              VARIANTS:
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary">Browse internships (Primary)</Button>
              <Button variant="outline">Explore training (Outline)</Button>
              <Button variant="text">View track → (Text link)</Button>
              <Button variant="primary" disabled>
                Disabled State
              </Button>
            </div>
          </div>

          <div className="space-y-2 border-t border-editorial-line pt-4">
            <span className="text-xs font-mono uppercase text-editorial-muted">
              SIZES:
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" size="sm">
                Apply now (sm: 44px)
              </Button>
              <Button variant="primary" size="md">
                Reserve a seat (md: 44px)
              </Button>
              <Button variant="primary" size="lg">
                Submit Application (lg: 48px)
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Form Controls: Input, Select, Textarea, Checkbox, Label */}
      <section className="space-y-6">
        <div className="border-b border-editorial-border pb-3">
          <h2 className="font-heading text-2xl font-bold text-ink">
            03. FORM CONTROLS // ACCESSIBLE INPUTS & VALIDATION
          </h2>
          <p className="text-xs font-mono text-editorial-muted mt-1">
            Square corners, min 44px height, high contrast focus states, and semantic
            error alerts
          </p>
        </div>

        <div className="border border-editorial-border bg-white p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 items-start">
            <Input
              label="Search"
              placeholder="Role or skill"
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
            />

            <Select
              label="Track"
              options={[
                { label: "All tracks", value: "ALL" },
                { label: "Web Development", value: "WEB" },
                { label: "App Development", value: "APP" },
                { label: "Data & AI", value: "AI" },
                { label: "UI/UX Design", value: "DESIGN" },
              ]}
            />

            <Select
              label="Mode"
              options={[
                { label: "Any", value: "ANY" },
                { label: "Remote", value: "REMOTE" },
                { label: "On-site", value: "ON_SITE" },
              ]}
            />

            <Select
              label="Duration"
              options={[
                { label: "Any", value: "ANY" },
                { label: "8 Weeks", value: "8" },
                { label: "12 Weeks", value: "12" },
                { label: "24 Weeks", value: "24" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-editorial-line pt-6">
            <Input
              label="Candidate Email"
              type="email"
              placeholder="name@university.edu"
              required
              helperText="We will never share your email with third parties."
            />

            <Input
              label="Invalid Field Demo"
              defaultValue="malformed_input"
              error="Valid URL starting with https://github.com is required"
            />
          </div>

          <div className="border-t border-editorial-line pt-6">
            <Textarea
              label="Screening Essay"
              placeholder="Explain a technical system or project you engineered..."
              helperText="Minimum 50 characters required for technical evaluation."
            />
          </div>

          <div className="border-t border-editorial-line pt-4 space-y-3">
            <Checkbox
              label="I accept the candidate terms of service and certify code authenticity."
              checked={checkboxChecked}
              onChange={(e) => setCheckboxChecked(e.target.checked)}
            />
            <Checkbox
              label="Checkbox with validation error demo"
              error="You must agree to the terms to proceed."
            />
          </div>
        </div>
      </section>

      {/* 4. Chips / Badges */}
      <section className="space-y-6">
        <div className="border-b border-editorial-border pb-3">
          <h2 className="font-heading text-2xl font-bold text-ink">
            04. CHIPS // TRACK LABELS MATCHING IMAGE 2
          </h2>
          <p className="text-xs font-mono text-editorial-muted mt-1">
            Square corners, 1px border, high readability
          </p>
        </div>

        <div className="border border-editorial-border bg-white p-6 flex flex-wrap gap-3">
          <Chip label="Web Development" />
          <Chip label="App Development" />
          <Chip label="Data & AI" />
          <Chip label="UI/UX Design" />
          <Chip label="Accent Variant" variant="accent" />
          <Chip label="Removable Tag" onRemove={() => alert("Tag removed")} />
        </div>
      </section>

      {/* 5. Cards: Track Card & Next Cohort Card (Matching Image 1) */}
      <section className="space-y-6">
        <div className="border-b border-editorial-border pb-3">
          <h2 className="font-heading text-2xl font-bold text-ink">
            05. CARDS // EXACT MATCH TO DESIGN REFERENCE IMAGE 1
          </h2>
          <p className="text-xs font-mono text-editorial-muted mt-1">
            Track cards with red ordinal numbers and Next Cohort metadata table card
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Track Card (4 cols) */}
          <div className="md:col-span-6 lg:col-span-4">
            <Card padding="lg" className="space-y-4">
              <div className="text-xs font-mono text-accent font-bold">01</div>
              <h3 className="font-heading text-xl font-bold text-ink">Web Development</h3>
              <p className="text-xs font-sans text-editorial-muted leading-relaxed">
                HTML to full-stack, built on real projects.
              </p>
              <div className="pt-2">
                <a
                  href="#track"
                  className="text-xs font-sans font-semibold text-ink hover:text-accent underline underline-offset-4"
                >
                  View track →
                </a>
              </div>
            </Card>
          </div>

          {/* Next Cohort Box (Matching Image 1 right hero card) */}
          <div className="md:col-span-6 lg:col-span-5">
            <Card padding="lg" className="space-y-6">
              <CardTitle>Next cohort</CardTitle>

              <div className="divide-y divide-editorial-line font-mono text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-editorial-muted">Start date</span>
                  <span className="text-ink font-bold">[DATE]</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-editorial-muted">Duration</span>
                  <span className="text-ink font-bold">[WEEKS]</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-editorial-muted">Mode</span>
                  <span className="text-ink font-bold">[REMOTE / ON-SITE]</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-editorial-muted">Seats left</span>
                  <span className="text-accent font-bold">[NUMBER]</span>
                </div>
              </div>

              <Button variant="primary" fullWidth size="md">
                Reserve a seat
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* 6. Tabs & Responsive Table (Matching Image 2) */}
      <section className="space-y-6">
        <div className="border-b border-editorial-border pb-3">
          <h2 className="font-heading text-2xl font-bold text-ink">
            06. TABS & TABLE // EXACT MATCH TO DESIGN REFERENCE IMAGE 2
          </h2>
          <p className="text-xs font-mono text-editorial-muted mt-1">
            Active tab with red bottom border, table collapsing to stacked cards on mobile
            (&lt;768px)
          </p>
        </div>

        <div className="space-y-6">
          <Tabs
            tabs={[
              { id: "internships", label: "Internships" },
              { id: "training", label: "Training" },
            ]}
            activeId={activeTab}
            onChange={setActiveTab}
          />

          <div className="font-mono text-xs text-editorial-muted">
            [NUMBER] open roles
          </div>

          <Table<DemoInternship>
            columns={tableColumns}
            data={sampleInternships}
            keyExtractor={(item) => item.id}
            caption="List of open internships and positions"
          />

          <Pagination
            currentPage={currentPage}
            totalPages={4}
            onPageChange={setCurrentPage}
          />
        </div>
      </section>

      {/* 7. Modal & Toast Interactive Demonstrations */}
      <section className="space-y-6">
        <div className="border-b border-editorial-border pb-3">
          <h2 className="font-heading text-2xl font-bold text-ink">
            07. MODAL & TOAST // FOCUS TRAP & ACCESSIBILITY
          </h2>
          <p className="text-xs font-mono text-editorial-muted mt-1">
            Focus trap, Escape to close, body scroll lock, screen reader status alerts
          </p>
        </div>

        <div className="border border-editorial-border bg-white p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap gap-4 items-center">
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              Open Accessible Modal Dialogue
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setToastType("success");
                setToastMessage("Payment transaction verified via ACID commit.");
              }}
            >
              Trigger Success Toast
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setToastType("error");
                setToastMessage("Validation error: Invalid Razorpay webhook signature.");
              }}
            >
              Trigger Error Toast
            </Button>
          </div>

          {toastMessage && (
            <div className="pt-2">
              <Toast
                type={toastType}
                title={
                  toastType === "success" ? "TRANSACTION COMMITTED" : "SIGNATURE ERROR"
                }
                message={toastMessage}
                onDismiss={() => setToastMessage(null)}
              />
            </div>
          )}
        </div>
      </section>

      {/* 8. Stepper, Skeleton & EmptyState */}
      <section className="space-y-6">
        <div className="border-b border-editorial-border pb-3">
          <h2 className="font-heading text-2xl font-bold text-ink">
            08. STEPPER, SKELETON & EMPTY STATE
          </h2>
          <p className="text-xs font-mono text-editorial-muted mt-1">
            4-step application indicator and state handlers
          </p>
        </div>

        <div className="space-y-8">
          <Stepper
            steps={[
              { number: 1, label: "Academics" },
              { number: 2, label: "Experience & Code" },
              { number: 3, label: "Screening Essay" },
              { number: 4, label: "Review & Commit" },
            ]}
            currentStep={2}
          />

          <div className="border border-editorial-border bg-white p-6 space-y-3">
            <div className="text-xs font-mono text-editorial-muted uppercase">
              SKELETON LOADING STATE:
            </div>
            <Skeleton height="32px" width="60%" />
            <Skeleton height="20px" width="90%" />
            <Skeleton height="20px" width="45%" />
          </div>

          <EmptyState
            title="No applications in this category"
            description="You have not submitted any applications for hybrid positions yet. Discover open tracks and apply today."
            actionLabel="Browse all roles"
            onAction={() => alert("Navigating to internships...")}
          />
        </div>
      </section>

      {/* Modal Instance */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Candidate Screening Verification"
        description="Verify your GitHub repository and test coverage artifacts before proceeding."
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-editorial-muted leading-relaxed">
            ByteHUB uses strict proof-of-work validation. Ensure your repositories include
            verifiable commit history and automated test harnesses.
          </p>
          <Input
            label="Primary Repository URL"
            placeholder="https://github.com/username/repo"
          />
          <div className="pt-4 flex justify-end gap-3 border-t border-editorial-line">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setModalOpen(false);
                setToastType("success");
                setToastMessage("Repository verified successfully.");
              }}
            >
              Confirm Repository
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
