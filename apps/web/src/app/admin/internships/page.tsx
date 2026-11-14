"use client";

import { useState } from "react";
import { useAdmin } from "../../../components/admin/AdminShell";
import { InternshipFormDrawer } from "../../../components/admin/InternshipForm";
import {
  IconBriefcase,
  IconExternal,
  IconPencil,
  IconPlus,
} from "../../../components/admin/icons";
import type {
  AdminInternship,
  Envelope,
  InternshipStatus,
  Paged,
} from "../../../components/admin/types";
import {
  Button,
  ButtonLink,
  ConfirmDialog,
  DataTable,
  DescriptionList,
  Drawer,
  EmptyState,
  FilterTabs,
  PageHeader,
  Pagination,
  Panel,
  RefreshButton,
  StatusBadge,
  plural,
  timeAgo,
  type Column,
} from "../../../components/admin/ui";
import {
  runAdminAction,
  useAdminResource,
} from "../../../components/admin/useAdminResource";
import { apiFetch } from "../../../lib/api";
import {
  formatDate,
  formatDuration,
  formatRegistrationFee,
  formatStipend,
  formatWorkMode,
} from "../../../lib/format";

type Filter = InternshipStatus | "ALL";

const PAGE_SIZE = 20;

const EMPTY_TEXT: Record<Filter, { title: string; description: string }> = {
  PUBLISHED: {
    title: "No live internships",
    description:
      "Post an internship and it appears here and on the public Internships page.",
  },
  CLOSED: {
    title: "No closed internships",
    description: "Internships you close stop taking applications and move here.",
  },
  DRAFT: { title: "No drafts", description: "Draft internships appear here." },
  ALL: {
    title: "No internships yet",
    description: "Post your first internship to get started.",
  },
};

export default function AdminInternshipsPage() {
  const { refreshSummary, notify, href: adminHref } = useAdmin();
  const [filter, setFilter] = useState<Filter>("PUBLISHED");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminInternship | null>(null);
  const [editing, setEditing] = useState<AdminInternship | "new" | null>(null);
  const [confirmClose, setConfirmClose] = useState<AdminInternship | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const path = `/admin/internships?limit=${PAGE_SIZE}&page=${page}${filter === "ALL" ? "" : `&status=${filter}`}`;
  const list = useAdminResource<Paged<AdminInternship>, Envelope<Paged<AdminInternship>>>(
    path,
    (res) => res.data
  );

  const changeFilter = (value: Filter) => {
    setFilter(value);
    setPage(1);
  };

  const setStatus = async (internship: AdminInternship, next: InternshipStatus) => {
    setBusyId(internship.id);
    const result = await runAdminAction(() =>
      apiFetch(`/admin/internships/${internship.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      })
    );
    setBusyId(null);
    setConfirmClose(null);
    if (!result.ok) {
      notify("error", result.message);
      return;
    }
    notify(
      "success",
      next === "PUBLISHED"
        ? `"${internship.title}" is live on the Internships page.`
        : `"${internship.title}" is closed to new applications.`
    );
    setSelected((current) =>
      current && current.id === internship.id ? { ...current, status: next } : current
    );
    list.reload();
    refreshSummary();
  };

  const applicantsHref = (i: AdminInternship) =>
    adminHref(`/applications?internship=${encodeURIComponent(i.id)}`);

  // On a single-status tab every row has the same status, so the column only shows on "All".
  const allColumns: (Column<AdminInternship> & { show?: boolean })[] = [
    {
      key: "title",
      header: "Internship",
      render: (i) => (
        <button
          type="button"
          onClick={() => setSelected(i)}
          className="block max-w-[20rem] text-left"
        >
          <span className="block truncate font-medium text-zinc-900 hover:text-blue-700">
            {i.title}
          </span>
          <span className="block truncate text-xs text-zinc-500">
            {i.companyName} · {i.location} · {formatWorkMode(i.type)}
          </span>
        </button>
      ),
    },
    {
      key: "stipend",
      header: "Stipend & deadline",
      className: "whitespace-nowrap",
      render: (i) => {
        const past = new Date(i.deadline).getTime() < Date.now();
        return (
          <div>
            <p className="tabular-nums text-zinc-900">
              {formatStipend(i.stipendAmount, i.currency)}
            </p>
            <p className={past ? "text-xs text-red-700" : "text-xs text-zinc-500"}>
              {past ? "Deadline passed" : "Apply by"} {formatDate(i.deadline)}
            </p>
          </div>
        );
      },
    },
    {
      key: "fee",
      header: "Registration fee",
      className: "whitespace-nowrap tabular-nums",
      hideBelow: "lg",
      render: (i) =>
        i.registrationFeeAmount > 0 ? (
          <span className="text-zinc-900">
            {formatRegistrationFee(i.registrationFeeAmount)}
          </span>
        ) : (
          <span className="text-zinc-500">Free</span>
        ),
    },
    {
      key: "applications",
      header: "Applicants",
      align: "right",
      className: "tabular-nums",
      render: (i) => i._count?.applications ?? 0,
    },
    {
      key: "posted",
      header: "Posted",
      className: "whitespace-nowrap text-zinc-500",
      hideBelow: "xl",
      render: (i) => timeAgo(i.createdAt),
    },
    {
      key: "status",
      header: "Status",
      show: filter === "ALL",
      render: (i) => <StatusBadge status={i.status} />,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (i) => (
        <div className="flex justify-end gap-1">
          <ButtonLink href={applicantsHref(i)} size="sm" variant="ghost">
            Applicants
          </ButtonLink>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(i)}
            aria-label={`Edit ${i.title}`}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];
  const columns = allColumns.filter((c) => c.show !== false);

  return (
    <>
      <PageHeader
        title="Internships"
        description="Every internship on ByteHUB is posted by your team. New internships go live on the public Internships page straight away."
        actions={
          <>
            <RefreshButton onClick={list.reload} busy={list.loading} />
            <Button variant="primary" onClick={() => setEditing("new")}>
              <IconPlus className="h-4 w-4" />
              Post internship
            </Button>
          </>
        }
      />

      <Panel>
        <FilterTabs
          label="Filter internships by status"
          value={filter}
          onChange={changeFilter}
          options={[
            { value: "PUBLISHED", label: "Live" },
            { value: "CLOSED", label: "Closed" },
            { value: "ALL", label: "All" },
          ]}
        />
        <DataTable
          caption="Internships"
          columns={columns}
          rows={list.data?.items}
          rowKey={(i) => i.id}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          empty={
            <EmptyState
              icon={IconBriefcase}
              {...EMPTY_TEXT[filter]}
              action={
                <Button variant="primary" size="sm" onClick={() => setEditing("new")}>
                  <IconPlus className="h-3.5 w-3.5" />
                  Post internship
                </Button>
              }
            />
          }
        />
        <Pagination
          meta={list.data?.meta}
          onPageChange={setPage}
          itemLabel="internships"
        />
      </Panel>

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ""}
        subtitle={
          selected && (
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selected.status} />
              <span>
                {selected.companyName} · posted {timeAgo(selected.createdAt)}
              </span>
            </span>
          )
        }
        footer={
          selected && (
            <>
              {selected.status === "PUBLISHED" && (
                <ButtonLink href={`/internships/${selected.slug}`} external>
                  <IconExternal className="h-4 w-4" />
                  Public page
                </ButtonLink>
              )}
              <ButtonLink href={applicantsHref(selected)}>
                Applicants ({selected._count?.applications ?? 0})
              </ButtonLink>
              <Button
                onClick={() => {
                  setEditing(selected);
                  setSelected(null);
                }}
              >
                <IconPencil className="h-4 w-4" />
                Edit
              </Button>
              {selected.status === "PUBLISHED" ? (
                <Button
                  variant="danger-outline"
                  disabled={busyId === selected.id}
                  onClick={() => setConfirmClose(selected)}
                >
                  Close listing
                </Button>
              ) : (
                <Button
                  variant="primary"
                  disabled={busyId === selected.id}
                  onClick={() => void setStatus(selected, "PUBLISHED")}
                >
                  {selected.status === "DRAFT" ? "Publish" : "Reopen"}
                </Button>
              )}
            </>
          )
        }
      >
        {selected && <InternshipDetails internship={selected} />}
      </Drawer>

      <ConfirmDialog
        open={confirmClose !== null}
        onClose={() => setConfirmClose(null)}
        onConfirm={() => confirmClose && void setStatus(confirmClose, "CLOSED")}
        busy={confirmClose !== null && busyId === confirmClose.id}
        danger
        title="Close this listing?"
        description="It disappears from the public Internships page and stops accepting applications. Existing applications are kept, and you can reopen it later."
        confirmLabel="Close listing"
      />

      {editing !== null && (
        <InternshipFormDrawer
          internship={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            notify("success", message);
            if (filter !== "PUBLISHED" && filter !== "ALL") setFilter("PUBLISHED");
            list.reload();
            refreshSummary();
          }}
        />
      )}
    </>
  );
}

function InternshipDetails({ internship }: { internship: AdminInternship }) {
  return (
    <>
      <DescriptionList
        items={[
          { label: "Company", value: internship.companyName },
          {
            label: "Company contact",
            value: internship.company ? (
              <a
                href={`mailto:${internship.company.email}`}
                className="text-blue-700 hover:underline"
              >
                {internship.company.email}
              </a>
            ) : (
              "—"
            ),
          },
          {
            label: "Location",
            value: `${internship.location} · ${formatWorkMode(internship.type)}`,
          },
          {
            label: "Stipend",
            value: formatStipend(internship.stipendAmount, internship.currency),
          },
          {
            label: "Registration fee",
            value:
              internship.registrationFeeAmount > 0
                ? `${formatRegistrationFee(internship.registrationFeeAmount)} (paid online when applying; refunded if not selected)`
                : "Free to apply",
          },
          { label: "Duration", value: formatDuration(internship.durationMonths) },
          { label: "Openings", value: plural(internship.openings, "opening") },
          { label: "Application deadline", value: formatDate(internship.deadline) },
          {
            label: "Applicants so far",
            value:
              internship.registrationFeeAmount > 0
                ? `${internship._count?.applications ?? 0} (paid applications only)`
                : (internship._count?.applications ?? 0),
          },
        ]}
      />

      <DetailSection title="Description">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
          {internship.description}
        </p>
      </DetailSection>

      {internship.whatYouWillDo.length > 0 && (
        <DetailSection title="What the intern will do">
          <BulletList items={internship.whatYouWillDo} />
        </DetailSection>
      )}

      {internship.requirements.length > 0 && (
        <DetailSection title="Requirements">
          <BulletList items={internship.requirements} />
        </DetailSection>
      )}

      {internship.skills.length > 0 && (
        <DetailSection title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {internship.skills.map((skill) => (
              <span key={skill} className="bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
                {skill}
              </span>
            ))}
          </div>
        </DetailSection>
      )}
    </>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-800">
      {items.map((item, index) => (
        <li key={`${index}-${item}`}>{item}</li>
      ))}
    </ul>
  );
}
