"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "../../../components/admin/AdminShell";
import { IconPlus, IconUsers } from "../../../components/admin/icons";
import type {
  AdminStaffRole,
  AdminUser,
  AdminUserDetail,
  Envelope,
  Paged,
} from "../../../components/admin/types";
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  DescriptionList,
  Dialog,
  Drawer,
  EmptyState,
  ExportButton,
  Field,
  FormError,
  Notice,
  PageHeader,
  Pagination,
  Panel,
  RefreshButton,
  SearchInput,
  SelectField,
  Skeleton,
  StatusBadge,
  inputClass,
  textareaClass,
  timeAgo,
  type Column,
} from "../../../components/admin/ui";
import {
  runAdminAction,
  useAdminResource,
} from "../../../components/admin/useAdminResource";
import { apiFetch } from "../../../lib/api";
import { formatDate, formatMoney } from "../../../lib/format";

type RoleFilter = "ALL" | "STUDENT" | "ADMIN";
type StatusFilter = "ALL" | "active" | "blocked";

const PAGE_SIZE = 25;
const SUPER_ADMIN_ROLE_ID = "role_super_admin";

/** Role badge: students, or the staff member's role. */
function RoleBadge({ user }: { user: AdminUser }) {
  if (user.role === "ADMIN") {
    return <Badge tone="violet">{user.staffRole?.name || "Staff (no role)"}</Badge>;
  }
  return <StatusBadge status={user.role} />;
}

function AccountStatus({ user }: { user: AdminUser }) {
  if (user.blockedAt) return <Badge tone="red">Blocked</Badge>;
  if (user.role === "ADMIN" && user.twoFactorEnabled === false) {
    return <Badge tone="amber">2FA not set up</Badge>;
  }
  return <Badge tone="green">Active</Badge>;
}

export default function AdminUsersPage() {
  const { can, notify } = useAdmin();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addingStaff, setAddingStaff] = useState(false);

  // Search runs on the server (it covers every account), shortly after typing stops.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });
  if (role !== "ALL") params.set("role", role);
  if (status !== "ALL") params.set("status", status);
  if (query) params.set("search", query);

  const users = useAdminResource<Paged<AdminUser>, Envelope<Paged<AdminUser>>>(
    `/admin/users?${params.toString()}`,
    (res) => res.data
  );

  const columns: Column<AdminUser>[] = [
    {
      key: "name",
      header: "Name",
      render: (u) => (
        <button
          type="button"
          onClick={() => setSelectedId(u.id)}
          className="flex items-center gap-3 text-left"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center bg-zinc-100 text-xs font-semibold uppercase text-zinc-600"
          >
            {u.name.trim().charAt(0) || "?"}
          </span>
          <span className="min-w-0 max-w-[16rem]">
            <span className="block truncate font-medium text-zinc-900 hover:text-blue-700">
              {u.name}
            </span>
            <span className="block truncate text-xs text-zinc-500">{u.email}</span>
          </span>
        </button>
      ),
    },
    { key: "role", header: "Role", render: (u) => <RoleBadge user={u} /> },
    { key: "status", header: "Status", render: (u) => <AccountStatus user={u} /> },
    {
      key: "joined",
      header: "Joined",
      className: "whitespace-nowrap",
      hideBelow: "lg",
      render: (u) => <span title={timeAgo(u.createdAt)}>{formatDate(u.createdAt)}</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (u) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSelectedId(u.id)}
          aria-label={`Manage ${u.name}`}
        >
          Manage
        </Button>
      ),
    },
  ];

  const filtered = Boolean(query) || role !== "ALL" || status !== "ALL";

  return (
    <>
      <PageHeader
        title="Users"
        description="Every account: students and staff. Open one to see their history, block or unblock them, or manage staff access."
        actions={
          <>
            {can("staff.manage") && (
              <Button variant="primary" onClick={() => setAddingStaff(true)}>
                <IconPlus className="h-4 w-4" />
                Add staff member
              </Button>
            )}
            {can("reports.export") && <ExportButton entity="users" />}
            <RefreshButton onClick={users.reload} busy={users.loading} />
          </>
        }
      />

      <Panel>
        <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput
            label="Search users"
            placeholder="Search by name or email"
            value={search}
            onChange={setSearch}
          />
          <div className="flex flex-wrap gap-3">
            <SelectField<RoleFilter>
              label="Role"
              value={role}
              onChange={(value) => {
                setRole(value);
                setPage(1);
              }}
              options={[
                { value: "ALL", label: "Students and staff" },
                { value: "STUDENT", label: "Students" },
                { value: "ADMIN", label: "Staff" },
              ]}
            />
            <SelectField<StatusFilter>
              label="Status"
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              options={[
                { value: "ALL", label: "Any status" },
                { value: "active", label: "Active" },
                { value: "blocked", label: "Blocked" },
              ]}
            />
          </div>
        </div>
        <DataTable
          caption="Users"
          columns={columns}
          rows={users.data?.items}
          rowKey={(u) => u.id}
          loading={users.loading}
          error={users.error}
          onRetry={users.reload}
          empty={
            <EmptyState
              icon={IconUsers}
              title={filtered ? "No users match" : "No users yet"}
              description={
                filtered
                  ? "Try a different name, email, role or status."
                  : "New sign-ups will appear here."
              }
            />
          }
        />
        <Pagination meta={users.data?.meta} onPageChange={setPage} itemLabel="users" />
      </Panel>

      {selectedId && (
        <UserDrawer
          userId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={(message) => {
            notify("success", message);
            users.reload();
          }}
          onDeleted={(message) => {
            setSelectedId(null);
            notify("success", message);
            users.reload();
          }}
        />
      )}

      {addingStaff && (
        <AddStaffDialog
          onClose={() => setAddingStaff(false)}
          onAdded={(message) => {
            setAddingStaff(false);
            notify("success", message);
            users.reload();
          }}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* One account                                                                                 */
/* ------------------------------------------------------------------------------------------ */

type DialogKind =
  | "edit"
  | "block"
  | "unblock"
  | "delete"
  | "reset"
  | "role"
  | "remove-staff"
  | "reset-2fa";

function UserDrawer({
  userId,
  onClose,
  onChanged,
  onDeleted,
}: {
  userId: string;
  onClose: () => void;
  onChanged: (message: string) => void;
  onDeleted: (message: string) => void;
}) {
  const { can, userId: myId, staff } = useAdmin();
  const detail = useAdminResource<AdminUserDetail, Envelope<AdminUserDetail>>(
    `/admin/users/${encodeURIComponent(userId)}`,
    (res) => res.data
  );
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = detail.data?.user;
  const isSelf = user?.id === myId;
  const isStaff = user?.role === "ADMIN";
  const iAmSuperAdmin = (staff?.permissions ?? []).includes("*");
  // Staff accounts need the "manage staff" permission; Super Admins only by Super Admins.
  const mayManageAccount =
    !isSelf &&
    can("users.manage") &&
    (!isStaff || can("staff.manage")) &&
    (user?.staffRole?.id !== SUPER_ADMIN_ROLE_ID || iAmSuperAdmin);
  const mayManageStaff =
    !isSelf &&
    isStaff &&
    can("staff.manage") &&
    (user?.staffRole?.id !== SUPER_ADMIN_ROLE_ID || iAmSuperAdmin);

  const act = async (
    request: () => Promise<unknown>,
    message: string,
    after: "reload" | "deleted" = "reload"
  ) => {
    setBusy(true);
    setError(null);
    const result = await runAdminAction(request);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    setDialog(null);
    if (after === "deleted") onDeleted(message);
    else {
      detail.reload();
      onChanged(message);
    }
    return true;
  };

  const post = (path: string, body?: unknown) =>
    apiFetch(path, { method: "POST", body: JSON.stringify(body ?? {}) });

  return (
    <Drawer
      open
      onClose={busy ? () => undefined : onClose}
      title={user?.name || "Account"}
      subtitle={
        user ? (
          <span className="flex flex-wrap items-center gap-2">
            <RoleBadge user={user} />
            <AccountStatus user={user} />
            {isSelf && <Badge tone="blue">You</Badge>}
          </span>
        ) : undefined
      }
      footer={
        user && (mayManageAccount || mayManageStaff) ? (
          <div className="flex w-full flex-wrap justify-end gap-2">
            {mayManageAccount && (
              <>
                <Button onClick={() => setDialog("edit")}>Edit</Button>
                {!user.blockedAt && (
                  <Button onClick={() => setDialog("reset")}>Send password reset</Button>
                )}
                {user.blockedAt ? (
                  <Button onClick={() => setDialog("unblock")}>Unblock</Button>
                ) : (
                  <Button variant="danger-outline" onClick={() => setDialog("block")}>
                    Block
                  </Button>
                )}
                <Button variant="danger-outline" onClick={() => setDialog("delete")}>
                  Delete
                </Button>
              </>
            )}
          </div>
        ) : undefined
      }
    >
      <FormError message={error} />
      {detail.loading && !user && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      )}
      {detail.error && <Notice tone="red">{detail.error}</Notice>}

      {user && detail.data && (
        <>
          {user.blockedAt && (
            <Notice tone="red" title={`Blocked ${timeAgo(user.blockedAt)}`}>
              Reason: {user.blockedReason || "not recorded"}. They can&apos;t sign in
              until someone unblocks the account.
            </Notice>
          )}
          {isSelf && (
            <Notice tone="blue">
              This is your account. Another Super Admin has to block, delete or change its
              role.
            </Notice>
          )}

          <DescriptionList
            items={[
              {
                label: "Email",
                value: (
                  <span className="flex flex-wrap items-center gap-2">
                    <a
                      href={`mailto:${user.email}`}
                      className="text-blue-700 hover:underline"
                    >
                      {user.email}
                    </a>
                    {user.isEmailVerified ? (
                      <Badge tone="green">Verified</Badge>
                    ) : (
                      <Badge tone="amber">Not verified</Badge>
                    )}
                  </span>
                ),
              },
              { label: "Joined", value: formatDate(user.createdAt) },
              {
                label: "Last sign-in",
                value: detail.data.lastLoginAt
                  ? timeAgo(detail.data.lastLoginAt)
                  : "Never",
              },
              ...(user.studentProfile?.phone
                ? [{ label: "Phone", value: user.studentProfile.phone }]
                : []),
              ...(user.studentProfile?.college
                ? [{ label: "College", value: user.studentProfile.college }]
                : []),
              ...(isStaff
                ? [
                    { label: "Staff role", value: user.staffRole?.name || "No role" },
                    {
                      label: "Two-factor sign-in",
                      value: user.twoFactorEnabled ? "On" : "Not set up yet",
                    },
                  ]
                : []),
            ]}
          />

          {mayManageStaff && (
            <section className="space-y-2 border-t border-zinc-200 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Staff access
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setDialog("role")}>
                  Change role
                </Button>
                {user.twoFactorEnabled && (
                  <Button size="sm" onClick={() => setDialog("reset-2fa")}>
                    Reset two-factor
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="danger-outline"
                  onClick={() => setDialog("remove-staff")}
                >
                  Remove staff access
                </Button>
              </div>
            </section>
          )}

          <History detail={detail.data} />
        </>
      )}

      {user && dialog === "edit" && (
        <EditUserDialog
          user={user}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(body) =>
            act(
              () =>
                apiFetch(`/admin/users/${user.id}`, {
                  method: "PATCH",
                  body: JSON.stringify(body),
                }),
              `${body.name || user.name}'s details were updated.`
            )
          }
        />
      )}
      {user && dialog === "block" && (
        <BlockDialog
          name={user.name}
          busy={busy}
          onClose={() => setDialog(null)}
          onBlock={(reason) =>
            act(
              () => post(`/admin/users/${user.id}/block`, { reason }),
              `${user.name} is blocked and has been signed out everywhere.`
            )
          }
        />
      )}
      {user && (
        <ConfirmDialog
          open={dialog === "unblock"}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            act(
              () => post(`/admin/users/${user.id}/unblock`),
              `${user.name} can sign in again.`
            )
          }
          title={`Unblock ${user.name}?`}
          description="They'll be able to sign in again straight away."
          confirmLabel="Unblock"
          busy={busy}
        />
      )}
      {user && (
        <ConfirmDialog
          open={dialog === "reset"}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            act(
              () => post(`/admin/users/${user.id}/password-reset`),
              `A password reset link was emailed to ${user.email}.`
            )
          }
          title="Send a password reset link?"
          description={`We'll email ${user.email} a link to choose a new password. Their current password keeps working until they do.`}
          confirmLabel="Send link"
          busy={busy}
        />
      )}
      {user && (
        <ConfirmDialog
          open={dialog === "delete"}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            act(
              () => apiFetch(`/admin/users/${user.id}`, { method: "DELETE" }),
              `${user.name}'s account was deleted.`,
              "deleted"
            )
          }
          title={`Delete ${user.name}'s account?`}
          description="Their name, email and profile are removed for good and they're signed out. Applications and payments stay in the records without their personal details. This can't be undone."
          confirmLabel="Delete account"
          danger
          busy={busy}
        />
      )}
      {user && dialog === "role" && (
        <ChangeRoleDialog
          user={user}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(roleId, roleName) =>
            act(
              () =>
                apiFetch(`/admin/users/${user.id}/staff-role`, {
                  method: "PATCH",
                  body: JSON.stringify({ roleId }),
                }),
              `${user.name} is now ${roleName}.`
            )
          }
        />
      )}
      {user && (
        <ConfirmDialog
          open={dialog === "remove-staff"}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            act(
              () =>
                apiFetch(`/admin/users/${user.id}/staff-role`, {
                  method: "PATCH",
                  body: JSON.stringify({ roleId: null }),
                }),
              `${user.name} no longer has staff access.`
            )
          }
          title={`Remove ${user.name}'s staff access?`}
          description="They become a normal account, lose access to the admin panel and are signed out. Their two-factor setup is cleared."
          confirmLabel="Remove access"
          danger
          busy={busy}
        />
      )}
      {user && (
        <ConfirmDialog
          open={dialog === "reset-2fa"}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            act(
              () => post(`/admin/users/${user.id}/reset-2fa`),
              `${user.name}'s two-factor sign-in was reset. They'll set it up again next time they sign in.`
            )
          }
          title="Reset two-factor sign-in?"
          description="Use this when someone has lost their phone and their backup codes. They're signed out and must link an authenticator app again at their next sign-in."
          confirmLabel="Reset"
          danger
          busy={busy}
        />
      )}
    </Drawer>
  );
}

function History({ detail }: { detail: AdminUserDetail }) {
  return (
    <div className="space-y-5 border-t border-zinc-200 pt-4">
      <HistoryList
        title={`Applications (${detail.user._count.applications})`}
        empty="No applications."
        rows={detail.applications.map((a) => ({
          key: a.id,
          main: a.internship?.title || "Internship",
          sub: `${a.internship?.companyName ?? ""} · ${formatDate(a.createdAt)}`,
          status: a.status,
        }))}
      />
      <HistoryList
        title={`Enrolments (${detail.user._count.enrollments})`}
        empty="No enrolments."
        rows={detail.enrollments.map((e) => ({
          key: e.id,
          main: e.cohort?.programme?.title || "Programme",
          sub: `${e.cohort?.cohortCode ?? ""} · ${formatDate(e.createdAt)}`,
          status: e.status,
        }))}
      />
      <HistoryList
        title={`Payments (${detail.user._count.payments})`}
        empty="No payments."
        rows={detail.payments.map((p) => ({
          key: p.orderId,
          main: formatMoney(p.amount, p.currency),
          sub: `${p.orderId} · ${formatDate(p.createdAt)}`,
          status: p.status,
        }))}
      />
    </div>
  );
}

function HistoryList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: { key: string; main: string; sub: string; status: string }[];
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-zinc-100 border border-zinc-200">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-900">{r.main}</p>
                <p className="truncate text-xs text-zinc-500">{r.sub}</p>
              </div>
              <StatusBadge status={r.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Dialogs                                                                                     */
/* ------------------------------------------------------------------------------------------ */

function EditUserDialog({
  user,
  busy,
  onClose,
  onSave,
}: {
  user: AdminUser;
  busy: boolean;
  onClose: () => void;
  onSave: (body: { name?: string; email?: string }) => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [problem, setProblem] = useState<string | null>(null);
  const save = () => {
    if (name.trim().length < 2)
      return setProblem("Enter a name (at least 2 characters).");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      return setProblem("Enter a valid email address.");
    }
    setProblem(null);
    onSave({
      ...(name.trim() !== user.name ? { name: name.trim() } : {}),
      ...(email.trim().toLowerCase() !== user.email ? { email: email.trim() } : {}),
    });
  };
  return (
    <Dialog
      open
      onClose={busy ? () => undefined : onClose}
      title="Edit account"
      description="Changing the email means they sign in with the new address and verify it again."
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={problem} />
        <Field label="Name" htmlFor="edit-name">
          <input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            data-autofocus
          />
        </Field>
        <Field label="Email" htmlFor="edit-email">
          <input
            id="edit-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
    </Dialog>
  );
}

function BlockDialog({
  name,
  busy,
  onClose,
  onBlock,
}: {
  name: string;
  busy: boolean;
  onClose: () => void;
  onBlock: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <Dialog
      open
      onClose={busy ? () => undefined : onClose}
      title={`Block ${name}?`}
      description="They're signed out everywhere and can't sign in until someone unblocks them. Their data stays."
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => {
              if (reason.trim().length < 3) {
                setProblem("Give a short reason, for the activity log.");
                return;
              }
              onBlock(reason.trim());
            }}
          >
            {busy ? "Blocking…" : "Block account"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormError message={problem} />
        <Field
          label="Reason"
          htmlFor="block-reason"
          hint="Kept in the activity log. The person isn't shown it."
        >
          <textarea
            id="block-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            rows={3}
            className={textareaClass}
            placeholder="e.g. Fake applications, abusive messages"
            data-autofocus
          />
        </Field>
      </div>
    </Dialog>
  );
}

function useRoles() {
  return useAdminResource<AdminStaffRole[], Envelope<AdminStaffRole[]>>(
    "/admin/roles",
    (res) => res.data
  );
}

function RoleSelect({
  roles,
  value,
  onChange,
}: {
  roles: AdminStaffRole[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { staff } = useAdmin();
  const iAmSuperAdmin = (staff?.permissions ?? []).includes("*");
  const available = roles.filter((r) => r.id !== SUPER_ADMIN_ROLE_ID || iAmSuperAdmin);
  const chosen = roles.find((r) => r.id === value);
  return (
    <Field
      label="Role"
      htmlFor="staff-role"
      hint={chosen?.description || "What this person can do in the admin panel."}
    >
      <select
        id="staff-role"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value="">Choose a role</option>
        {available.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
            {r.isSystem ? "" : " (custom)"}
          </option>
        ))}
      </select>
    </Field>
  );
}

function ChangeRoleDialog({
  user,
  busy,
  onClose,
  onSave,
}: {
  user: AdminUser;
  busy: boolean;
  onClose: () => void;
  onSave: (roleId: string, roleName: string) => void;
}) {
  const roles = useRoles();
  const [roleId, setRoleId] = useState(user.staffRole?.id || "");
  const role = roles.data?.find((r) => r.id === roleId);
  return (
    <Dialog
      open
      onClose={busy ? () => undefined : onClose}
      title={`Change ${user.name}'s role`}
      description="The change applies straight away, even if they're signed in."
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={busy || !role || roleId === user.staffRole?.id}
            onClick={() => role && onSave(role.id, role.name)}
          >
            {busy ? "Saving…" : "Save role"}
          </Button>
        </>
      }
    >
      {roles.error ? (
        <Notice tone="red">{roles.error}</Notice>
      ) : (
        <RoleSelect roles={roles.data ?? []} value={roleId} onChange={setRoleId} />
      )}
    </Dialog>
  );
}

function AddStaffDialog({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (message: string) => void;
}) {
  const roles = useRoles();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("Enter their email address.");
      return;
    }
    if (!roleId) {
      setError("Choose a role.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await runAdminAction(() =>
      apiFetch<Envelope<{ invited: boolean; email: string; role: string }>>(
        "/admin/staff",
        {
          method: "POST",
          body: JSON.stringify({
            email: email.trim(),
            roleId,
            ...(name.trim() ? { name: name.trim() } : {}),
          }),
        }
      )
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const data = result.value.data;
    onAdded(
      data.invited
        ? `Invitation sent to ${data.email}. They choose a password from the email, then set up two-factor sign-in.`
        : `${data.email} is now ${data.role}. They'll set up two-factor sign-in next time they sign in.`
    );
  };

  return (
    <Dialog
      open
      onClose={busy ? () => undefined : onClose}
      title="Add a staff member"
      description="If they already have a ByteHUB account, it gets staff access. Otherwise we email them a link to choose a password."
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={add} disabled={busy}>
            {busy ? "Adding…" : "Add staff member"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        <Field label="Email" htmlFor="staff-email">
          <input
            id="staff-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="name@bytehubnet.com"
            data-autofocus
          />
        </Field>
        <Field
          label="Name (optional)"
          htmlFor="staff-name"
          hint="Used if they don't have an account yet."
        >
          <input
            id="staff-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </Field>
        {roles.error ? (
          <Notice tone="red">{roles.error}</Notice>
        ) : (
          <RoleSelect roles={roles.data ?? []} value={roleId} onChange={setRoleId} />
        )}
        <Notice tone="blue">
          Every staff member must set up two-factor sign-in with an authenticator app
          before they can use the admin panel.
        </Notice>
      </div>
    </Dialog>
  );
}
