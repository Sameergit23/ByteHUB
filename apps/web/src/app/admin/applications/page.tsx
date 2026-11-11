"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAdmin } from "../../../components/admin/AdminShell";
import { IconApplicant, IconExternal } from "../../../components/admin/icons";
import type {
  AdminApplication,
  AdminInternship,
  ApplicationStatus,
  Envelope,
  Paged,
} from "../../../components/admin/types";
import {
  Button,
  DataTable,
  DescriptionList,
  Drawer,
  EmptyState,
  Field,
  FilterTabs,
  FormError,
  Notice,
  PageHeader,
  Pagination,
  Panel,
  RefreshButton,
  SearchInput,
  SelectField,
  StatusBadge,
  inputClass,
  statusLabel,
  textareaClass,
  timeAgo,
  type Column,
} from "../../../components/admin/ui";
import {
  runAdminAction,
  useAdminResource,
} from "../../../components/admin/useAdminResource";
import { apiFetch, ApiError } from "../../../lib/api";
import { formatDate } from "../../../lib/format";

type Filter = ApplicationStatus | "ALL";

const PAGE_SIZE = 20;

/** Stages an admin can move a candidate to (withdrawing is the student's choice). */
const NEXT_STAGES: ApplicationStatus[] = [
  "UNDER_REVIEW",
  "INTERVIEW",
  "OFFERED",
  "REJECTED",
];

export default function AdminApplicationsPage() {
  return (
    <Suspense fallback={null}>
      <ApplicationsView />
    </Suspense>
  );
}

function ApplicationsView() {
  const { notify, refreshSummary, summary } = useAdmin();
  const searchParams = useSearchParams();
  const [internshipId, setInternshipId] = useState(
    searchParams.get("internship") || "ALL"
  );
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminApplication | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });
  if (filter !== "ALL") params.set("status", filter);
  if (internshipId !== "ALL") params.set("internshipId", internshipId);
  if (query) params.set("search", query);

  const applications = useAdminResource<
    Paged<AdminApplication>,
    Envelope<Paged<AdminApplication>>
  >(`/admin/applications?${params.toString()}`, (res) => res.data);

  const internships = useAdminResource<
    AdminInternship[],
    Envelope<Paged<AdminInternship>>
  >("/admin/internships?limit=50", (res) => res.data.items);

  const columns: Column<AdminApplication>[] = [
    {
      key: "applicant",
      header: "Applicant",
      render: (a) => (
        <button
          type="button"
          onClick={() => setSelected(a)}
          className="block max-w-[16rem] text-left"
        >
          <span className="block truncate font-medium text-zinc-900 hover:text-blue-700">
            {a.fullName}
          </span>
          <span className="block truncate text-xs text-zinc-500">{a.email}</span>
        </button>
      ),
    },
    {
      key: "internship",
      header: "Internship",
      render: (a) => (
        <div className="max-w-[16rem]">
          <p className="truncate text-zinc-900">{a.internship?.title || "—"}</p>
          <p className="truncate text-xs text-zinc-500">{a.internship?.companyName}</p>
        </div>
      ),
    },
    {
      key: "college",
      header: "College",
      hideBelow: "xl",
      render: (a) => (
        <div className="max-w-[14rem]">
          <p className="truncate text-zinc-700">{a.collegeOrUniversity}</p>
          <p className="text-xs text-zinc-500">Graduates {a.graduationYear}</p>
        </div>
      ),
    },
    {
      key: "applied",
      header: "Applied",
      className: "whitespace-nowrap text-zinc-500",
      render: (a) => timeAgo(a.createdAt),
    },
    { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (a) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSelected(a)}
          aria-label={`Review ${a.fullName}`}
        >
          Review
        </Button>
      ),
    },
  ];

  const newCount = summary.metrics?.newApplications ?? null;

  return (
    <>
      <PageHeader
        title="Applications"
        description="Every application to your internships. Open the resume, then move the student through the stages; they get an email at each change."
        actions={
          <RefreshButton onClick={applications.reload} busy={applications.loading} />
        }
      />

      <Panel>
        <FilterTabs
          label="Filter applications by stage"
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
          options={[
            { value: "ALL", label: "All" },
            { value: "SUBMITTED", label: "New", count: newCount },
            { value: "UNDER_REVIEW", label: "In review" },
            { value: "INTERVIEW", label: "Interview" },
            { value: "OFFERED", label: "Offered" },
            { value: "REJECTED", label: "Not selected" },
            { value: "WITHDRAWN", label: "Withdrawn" },
          ]}
        />
        <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            label="Search applicants"
            placeholder="Search by name or email"
            value={search}
            onChange={setSearch}
          />
          <SelectField<string>
            label="Internship"
            value={internshipId}
            onChange={(value) => {
              setInternshipId(value);
              setPage(1);
            }}
            options={[
              { value: "ALL", label: "All internships" },
              ...(internships.data ?? []).map((i) => ({ value: i.id, label: i.title })),
            ]}
          />
        </div>
        <DataTable
          caption="Applications"
          columns={columns}
          rows={applications.data?.items}
          rowKey={(a) => a.id}
          loading={applications.loading}
          error={applications.error}
          onRetry={applications.reload}
          empty={
            <EmptyState
              icon={IconApplicant}
              title={
                filter === "ALL" && internshipId === "ALL" && !query
                  ? "No applications yet"
                  : "No applications match"
              }
              description={
                filter === "ALL" && internshipId === "ALL" && !query
                  ? "When students apply to your internships, they appear here."
                  : "Try another stage, internship or search."
              }
            />
          }
        />
        <Pagination
          meta={applications.data?.meta}
          onPageChange={setPage}
          itemLabel="applications"
        />
      </Panel>

      {selected && (
        <ApplicationDrawer
          application={selected}
          onClose={() => setSelected(null)}
          onUpdated={(updated, message) => {
            setSelected(updated);
            notify("success", message);
            applications.reload();
            refreshSummary();
          }}
          onError={(message) => notify("error", message)}
        />
      )}
    </>
  );
}

function ApplicationDrawer({
  application,
  onClose,
  onUpdated,
  onError,
}: {
  application: AdminApplication;
  onClose: () => void;
  onUpdated: (updated: AdminApplication, message: string) => void;
  onError: (message: string) => void;
}) {
  const withdrawn = application.status === "WITHDRAWN";
  const [stage, setStage] = useState<ApplicationStatus>(
    NEXT_STAGES.includes(application.status) ? application.status : "UNDER_REVIEW"
  );
  const [note, setNote] = useState(application.feedbackNote || "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [openingResume, setOpeningResume] = useState(false);

  const save = async () => {
    setError(null);
    setSaving(true);
    const result = await runAdminAction(() =>
      apiFetch(`/applications/${application.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: stage,
          ...(note.trim() ? { feedbackNote: note.trim() } : {}),
        }),
      })
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onUpdated(
      { ...application, status: stage, feedbackNote: note.trim() || null },
      `${application.fullName} is now "${statusLabel(stage)}". They were emailed about it.`
    );
  };

  const openResume = async () => {
    // Opened inside the click so pop-up blockers allow it; the link is filled in below.
    const tab = window.open("", "_blank");
    setOpeningResume(true);
    try {
      const res = await apiFetch<Envelope<{ resumeUrl?: string }>>(
        `/applications/${application.id}/resume`
      );
      const url = res.data?.resumeUrl;
      if (!url) throw new Error("No resume is attached to this application.");
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (err) {
      tab?.close();
      onError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "The resume could not be opened."
      );
    } finally {
      setOpeningResume(false);
    }
  };

  const links: { label: string; href: string }[] = [
    { label: "GitHub", href: application.githubUrl },
    { label: "LinkedIn", href: application.linkedinUrl },
    ...(application.portfolioUrl
      ? [{ label: "Portfolio", href: application.portfolioUrl }]
      : []),
  ].filter((l) => /^https?:\/\//i.test(l.href));

  return (
    <Drawer
      open
      onClose={saving ? () => undefined : onClose}
      title={application.fullName}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge status={application.status} />
          <span>
            {application.internship?.title || "Internship"} · applied{" "}
            {timeAgo(application.createdAt)}
          </span>
        </span>
      }
      footer={
        <>
          <Button onClick={openResume} disabled={!application.hasResume || openingResume}>
            <IconExternal className="h-4 w-4" />
            {openingResume
              ? "Opening…"
              : application.hasResume
                ? "Open resume"
                : "No resume"}
          </Button>
          {!withdrawn && (
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save stage"}
            </Button>
          )}
        </>
      }
    >
      <DescriptionList
        items={[
          {
            label: "Email",
            value: (
              <a
                href={`mailto:${application.email}`}
                className="text-blue-700 hover:underline"
              >
                {application.email}
              </a>
            ),
          },
          {
            label: "Phone",
            value: (
              <a
                href={`tel:${application.phone}`}
                className="text-blue-700 hover:underline"
              >
                {application.phone}
              </a>
            ),
          },
          { label: "College", value: application.collegeOrUniversity },
          {
            label: "Degree",
            value: `${application.degree} · graduates ${application.graduationYear}`,
          },
          {
            label: "Available",
            value: `${application.availableHoursPerWeek} hours a week`,
          },
          { label: "Can start", value: formatDate(application.earliestStartDate) },
        ]}
      />

      {links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              {l.label}
              <IconExternal className="h-3 w-3" />
            </a>
          ))}
        </div>
      )}

      <Section title="About them">{application.bioSummary}</Section>
      <Section title="Why this internship">{application.whyInterested}</Section>
      <Section title="A project they're proud of">
        {application.relevantProjectDescription}
      </Section>

      <section className="space-y-3 border-t border-zinc-200 pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Stage
        </h3>
        {withdrawn ? (
          <Notice tone="amber">
            This student withdrew their application, so it can&apos;t be changed.
          </Notice>
        ) : (
          <>
            <FormError message={error} />
            <Field label="Move to" htmlFor="app-stage">
              <select
                id="app-stage"
                value={stage}
                onChange={(e) => setStage(e.target.value as ApplicationStatus)}
                className={inputClass}
              >
                {NEXT_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Note for the student (optional)"
              htmlFor="app-note"
              hint="Shown to the student in their dashboard, e.g. interview details or feedback."
            >
              <textarea
                id="app-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
                className={textareaClass}
                rows={3}
              />
            </Field>
          </>
        )}
      </section>
    </Drawer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h3>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
        {children}
      </p>
    </section>
  );
}
