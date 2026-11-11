"use client";

import { useMemo, useState } from "react";
import { useAdmin } from "../../../components/admin/AdminShell";
import { IconChevronLeft, IconInbox, IconMail } from "../../../components/admin/icons";
import type { AdminMessage, Envelope } from "../../../components/admin/types";
import {
  Button,
  EmptyState,
  ErrorState,
  FilterTabs,
  PageHeader,
  Panel,
  RefreshButton,
  Skeleton,
  buttonClass,
  cx,
  timeAgo,
} from "../../../components/admin/ui";
import {
  runAdminAction,
  useAdminResource,
} from "../../../components/admin/useAdminResource";
import { apiFetch } from "../../../lib/api";
import { formatDateTime } from "../../../lib/format";

type Filter = "UNREAD" | "ALL";

export default function AdminMessagesPage() {
  const { notify, refreshSummary } = useAdmin();
  const [filter, setFilter] = useState<Filter>("UNREAD");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [handled, setHandled] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const inbox = useAdminResource<AdminMessage[], Envelope<AdminMessage[]>>(
    "/admin/contact-messages",
    (res) => res.data
  );

  // Messages marked as handled here update instantly, before the list reloads.
  const all = useMemo(
    () => (inbox.data ?? []).map((m) => (handled.has(m.id) ? { ...m, isRead: true } : m)),
    [inbox.data, handled]
  );
  const unreadCount = all.filter((m) => !m.isRead).length;
  const visible = filter === "UNREAD" ? all.filter((m) => !m.isRead) : all;
  const selected = all.find((m) => m.id === selectedId) ?? null;

  const markHandled = async (message: AdminMessage) => {
    setBusy(true);
    const result = await runAdminAction(() =>
      apiFetch(`/admin/contact-messages/${message.id}/read`, {
        method: "PATCH",
        body: "{}",
      })
    );
    setBusy(false);
    if (!result.ok) {
      notify("error", result.message);
      return;
    }
    setHandled((prev) => new Set(prev).add(message.id));
    notify("success", `Marked "${message.topic}" from ${message.fullName} as handled.`);
    refreshSummary();
  };

  return (
    <>
      <PageHeader
        title="Inbox"
        description="Messages sent through the website's contact form. Reply by email, then mark them as handled."
        actions={
          <RefreshButton
            onClick={() => {
              setHandled(new Set());
              inbox.reload();
            }}
            busy={inbox.loading}
          />
        }
      />

      <Panel bodyClassName="lg:grid lg:min-h-[32rem] lg:grid-cols-[22rem_1fr]">
        {/* Message list */}
        <div className={cx("border-zinc-200 lg:border-r", selected && "hidden lg:block")}>
          <FilterTabs
            label="Filter messages"
            value={filter}
            onChange={setFilter}
            options={[
              {
                value: "UNREAD",
                label: "Unread",
                count: inbox.data ? unreadCount : null,
              },
              { value: "ALL", label: "All", count: inbox.data ? all.length : null },
            ]}
          />
          {inbox.loading && !inbox.data ? (
            <div className="space-y-4 px-4 py-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : inbox.error && !inbox.data ? (
            <ErrorState message={inbox.error} onRetry={inbox.reload} />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={IconInbox}
              title={filter === "UNREAD" ? "No unread messages" : "No messages yet"}
              description={
                filter === "UNREAD"
                  ? "You're all caught up."
                  : "Messages from the contact form will appear here."
              }
            />
          ) : (
            <ul className="divide-y divide-zinc-100 lg:max-h-[40rem] lg:overflow-y-auto">
              {visible.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    aria-current={m.id === selectedId ? "true" : undefined}
                    className={cx(
                      "block w-full px-4 py-3 text-left transition-colors",
                      m.id === selectedId ? "bg-blue-50" : "hover:bg-zinc-50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        {!m.isRead && (
                          <>
                            <span
                              className="h-2 w-2 shrink-0 bg-blue-600"
                              aria-hidden="true"
                            />
                            <span className="sr-only">Unread:</span>
                          </>
                        )}
                        <span
                          className={cx(
                            "truncate text-sm",
                            m.isRead ? "text-zinc-700" : "font-semibold text-zinc-900"
                          )}
                        >
                          {m.fullName}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-zinc-400">
                        {timeAgo(m.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-zinc-800">{m.topic}</p>
                    <p className="truncate text-xs text-zinc-500">{m.message}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {inbox.data && inbox.data.length >= 50 && (
            <p className="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500">
              Showing the 50 most recent messages.
            </p>
          )}
        </div>

        {/* Reading pane */}
        <div className={cx(!selected && "hidden lg:block")}>
          {selected ? (
            <article className="flex h-full flex-col">
              <div className="border-b border-zinc-200 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="-ml-1 mb-3 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 lg:hidden"
                >
                  <IconChevronLeft className="h-4 w-4" />
                  All messages
                </button>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-zinc-900">
                      {selected.topic}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      {selected.fullName} ·{" "}
                      <a
                        href={`mailto:${selected.email}`}
                        className="text-blue-700 hover:underline"
                      >
                        {selected.email}
                      </a>
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Received {formatDateTime(selected.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <a
                      href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: ${selected.topic}`)}`}
                      className={buttonClass("secondary")}
                    >
                      <IconMail className="h-4 w-4" />
                      Reply by email
                    </a>
                    {!selected.isRead && (
                      <Button
                        variant="primary"
                        disabled={busy}
                        onClick={() => markHandled(selected)}
                      >
                        {busy ? "Saving…" : "Mark as handled"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 px-5 py-5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
                  {selected.message}
                </p>
                {selected.isRead && (
                  <p className="mt-6 text-xs text-zinc-500">
                    Handled
                    {selected.respondedAt
                      ? ` ${formatDateTime(selected.respondedAt)}`
                      : ""}
                    .
                  </p>
                )}
              </div>
            </article>
          ) : (
            <EmptyState
              icon={IconMail}
              title="Select a message"
              description="Pick a message on the left to read it here."
            />
          )}
        </div>
      </Panel>
    </>
  );
}
