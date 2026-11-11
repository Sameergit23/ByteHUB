"use client";

import { useState } from "react";
import { useAdmin } from "../../../components/admin/AdminShell";
import { IconBriefcase, IconExternal } from "../../../components/admin/icons";
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
  formatStipend,
  formatWorkMode,
} from "../../../lib/format";

type Filter = InternshipStatus | "ALL";

const PAGE_SIZE = 20;

const EMPTY_TEXT: Record<Filter, { title: string; description: string }> = {
  DRAFT: {
    title: "Nothing waiting for approval",
    description:
      "When a company submits an internship, it appears here for you to review.",
  },
  PUBLISHED: {
    title: "No live internships",
    description: "Approved internships appear here.",
  },
  CLOSED: {
    title: "No closed internships",
    description: "Closed or declined postings appear here.",
  },
  ALL: {
    title: "No internships yet",
    description: "Companies haven't posted any internships.",
  },
};

interface PendingChange {
  internship: AdminInternship;
  next: InternshipStatus;
}

export default function AdminInternshipsPage() {
  const { summary, refreshSummary, notify } = useAdmin();
  const [filter, setFilter] = useState<Filter>("DRAFT");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminInternship | null>(null);
  const [confirm, setConfirm] = useState<PendingChange | null>(null);
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
    setConfirm(null);

    if (!result.ok) {
      notify("error", result.message);
      return;
    }
    const messages: Record<InternshipStatus, string> = {
      PUBLISHED:
        internship.status === "DRAFT"
          ? `"${internship.title}" is approved and now live.`
          : `"${internship.title}" is live again.`,
      CLOSED:
        internship.status === "DRAFT"
          ? `"${internship.title}" was declined. It won't be published.`
          : `"${internship.title}" is closed to new applications.`,
      DRAFT: `"${internship.title}" was moved back to drafts.`,
    };
    notify("success", messages[next]);
    setSelected((current) =>
      current && current.id === internship.id ? { ...current, status: next } : current
    );
    list.reload();
    refreshSummary();
  };

  /** Approving is the expected action, so it runs at once; declining and closing ask first. */
  const requestStatus = (internship: AdminInternship, next: InternshipStatus) => {
    if (next === "PUBLISHED") {
      void setStatus(internship, next);
    } else {
      setConfirm({ internship, next });
    }
  };

  // On a single-status tab the status (and, for drafts, the applicant count) is the same on
  // every row, so those columns only appear where they tell you something.
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
      key: "applications",
      header: "Applicants",
      align: "right",
      className: "tabular-nums",
      show: filter !== "DRAFT",
      render: (i) => i._count?.applications ?? 0,
    },
    {
      key: "submitted",
      header: "Submitted",
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
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setSelected(i)}>
            Review
          </Button>
          {i.status === "DRAFT" && (
            <Button
              size="sm"
              variant="primary"
              disabled={busyId === i.id}
              onClick={() => requestStatus(i, "PUBLISHED")}
            >
              Approve
            </Button>
          )}
        </div>
      ),
    },
  ];
  const columns = allColumns.filter((c) => c.show !== false);

  return (
    <>
      <PageHeader
        title="Internship approvals"
        description="Review what companies post before it goes live. Approved internships appear on the public Internships page straight away."
        actions={<RefreshButton onClick={list.reload} busy={list.loading} />}
      />

      <Panel>
        <FilterTabs
          label="Filter internships by status"
          value={filter}
          onChange={changeFilter}
          options={[
            {
              value: "DRAFT",
              label: "Awaiting approval",
              count: summary.pendingApprovals,
            },
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
          empty={<EmptyState icon={IconBriefcase} {...EMPTY_TEXT[filter]} />}
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
                {selected.companyName} · submitted {timeAgo(selected.createdAt)}
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
                  View public page
                </ButtonLink>
              )}
              {selected.status === "DRAFT" && (
                <>
                  <Button
                    variant="danger-outline"
                    disabled={busyId === selected.id}
                    onClick={() => requestStatus(selected, "CLOSED")}
                  >
                    Decline
                  </Button>
                  <Button
                    variant="primary"
                    disabled={busyId === selected.id}
                    onClick={() => requestStatus(selected, "PUBLISHED")}
                  >
                    Approve &amp; publish
                  </Button>
                </>
              )}
              {selected.status === "PUBLISHED" && (
                <Button
                  variant="danger-outline"
                  disabled={busyId === selected.id}
                  onClick={() => requestStatus(selected, "CLOSED")}
                >
                  Close listing
                </Button>
              )}
              {selected.status === "CLOSED" && (
                <Button
                  variant="primary"
                  disabled={busyId === selected.id}
                  onClick={() => requestStatus(selected, "PUBLISHED")}
                >
                  Reopen
                </Button>
              )}
            </>
          )
        }
      >
        {selected && <InternshipDetails internship={selected} />}
      </Drawer>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && void setStatus(confirm.internship, confirm.next)}
        busy={confirm !== null && busyId === confirm.internship.id}
        danger
        title={
          confirm?.internship.status === "DRAFT"
            ? "Decline this internship?"
            : "Close this listing?"
        }
        description={
          confirm?.internship.status === "DRAFT"
            ? "It won't be published. The company will see it as Closed. You can still reopen it later."
            : "It disappears from the public Internships page and stops accepting applications. Existing applications are kept, and you can reopen it later."
        }
        confirmLabel={
          confirm?.internship.status === "DRAFT" ? "Decline" : "Close listing"
        }
      />
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
          { label: "Duration", value: formatDuration(internship.durationMonths) },
          { label: "Openings", value: plural(internship.openings, "opening") },
          { label: "Application deadline", value: formatDate(internship.deadline) },
          { label: "Applicants so far", value: internship._count?.applications ?? 0 },
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
