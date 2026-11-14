"use client";

import { useMemo, useState } from "react";
import {
  ALL_STAFF_PERMISSIONS,
  STAFF_PERMISSIONS,
  hasStaffPermission,
  type StaffPermission,
} from "@bytehub/shared";
import { useAdmin } from "../../../components/admin/AdminShell";
import { IconPlus, IconShield } from "../../../components/admin/icons";
import type { AdminStaffRole, Envelope } from "../../../components/admin/types";
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Drawer,
  EmptyState,
  Field,
  FormError,
  Notice,
  PageHeader,
  Panel,
  RefreshButton,
  inputClass,
  plural,
  type Column,
} from "../../../components/admin/ui";
import {
  runAdminAction,
  useAdminResource,
} from "../../../components/admin/useAdminResource";
import { apiFetch } from "../../../lib/api";

const SUPER_ADMIN_ROLE_ID = "role_super_admin";

/** Permissions grouped for the checklist ("Internships", "Payments", …). */
const PERMISSION_GROUPS = ALL_STAFF_PERMISSIONS.reduce<
  { group: string; items: StaffPermission[] }[]
>((groups, key) => {
  const group = STAFF_PERMISSIONS[key].group;
  const existing = groups.find((g) => g.group === group);
  if (existing) existing.items.push(key);
  else groups.push({ group, items: [key] });
  return groups;
}, []);

function permissionCount(role: AdminStaffRole): string {
  return role.permissions.includes("*")
    ? "Every permission"
    : plural(role.permissions.length, "permission");
}

export default function AdminRolesPage() {
  const { notify } = useAdmin();
  const roles = useAdminResource<AdminStaffRole[], Envelope<AdminStaffRole[]>>(
    "/admin/roles",
    (res) => res.data
  );
  const [editing, setEditing] = useState<AdminStaffRole | "new" | null>(null);

  const columns: Column<AdminStaffRole>[] = [
    {
      key: "name",
      header: "Role",
      render: (r) => (
        <button
          type="button"
          onClick={() => setEditing(r)}
          className="block max-w-[22rem] text-left"
        >
          <span className="flex items-center gap-2">
            <span className="font-medium text-zinc-900 hover:text-blue-700">
              {r.name}
            </span>
            {r.isSystem ? <Badge>Built-in</Badge> : <Badge tone="blue">Custom</Badge>}
          </span>
          {r.description && (
            <span className="mt-0.5 block truncate text-xs text-zinc-500">
              {r.description}
            </span>
          )}
        </button>
      ),
    },
    {
      key: "permissions",
      header: "Permissions",
      className: "whitespace-nowrap",
      render: (r) => permissionCount(r),
    },
    {
      key: "staff",
      header: "Staff",
      align: "right",
      className: "tabular-nums",
      render: (r) => r.staffCount,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (r) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditing(r)}
          aria-label={`Open ${r.name}`}
        >
          {r.id === SUPER_ADMIN_ROLE_ID ? "View" : "Edit"}
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="What each kind of staff member can do. The server checks these on every action, so hiding a button is never the only protection."
        actions={
          <>
            <Button variant="primary" onClick={() => setEditing("new")}>
              <IconPlus className="h-4 w-4" />
              New role
            </Button>
            <RefreshButton onClick={roles.reload} busy={roles.loading} />
          </>
        }
      />

      <Panel>
        <DataTable
          caption="Staff roles"
          columns={columns}
          rows={roles.data}
          rowKey={(r) => r.id}
          loading={roles.loading}
          error={roles.error}
          onRetry={roles.reload}
          empty={
            <EmptyState
              icon={IconShield}
              title="No roles yet"
              description="Create one to get started."
            />
          }
        />
      </Panel>

      {roles.data && roles.data.length > 0 && <PermissionMatrix roles={roles.data} />}

      {editing && (
        <RoleEditor
          role={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            notify("success", message);
            roles.reload();
          }}
        />
      )}
    </>
  );
}

/** Every role against every permission, at a glance. */
function PermissionMatrix({ roles }: { roles: AdminStaffRole[] }) {
  return (
    <Panel
      title="Who can do what"
      description="A tick means the role has that permission."
      className="mt-6"
    >
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <caption className="sr-only">Permissions by role</caption>
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <th scope="col" className="px-4 py-2">
                Permission
              </th>
              {roles.map((r) => (
                <th key={r.id} scope="col" className="px-3 py-2 text-center">
                  {r.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((group) => (
              <FragmentRows key={group.group} group={group} roles={roles} />
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function FragmentRows({
  group,
  roles,
}: {
  group: { group: string; items: StaffPermission[] };
  roles: AdminStaffRole[];
}) {
  return (
    <>
      <tr className="bg-zinc-50/60">
        <th
          scope="colgroup"
          colSpan={roles.length + 1}
          className="px-4 pb-1 pt-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400"
        >
          {group.group}
        </th>
      </tr>
      {group.items.map((key) => (
        <tr key={key} className="border-b border-zinc-100">
          <th scope="row" className="px-4 py-2 text-left font-normal text-zinc-700">
            {STAFF_PERMISSIONS[key].label}
          </th>
          {roles.map((r) => (
            <td key={r.id} className="px-3 py-2 text-center">
              {hasStaffPermission(r.permissions, key) ? (
                <span className="text-emerald-600" aria-label="Yes">
                  ✓
                </span>
              ) : (
                <span className="text-zinc-300" aria-label="No">
                  –
                </span>
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function RoleEditor({
  role,
  onClose,
  onSaved,
}: {
  role: AdminStaffRole | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { staff } = useAdmin();
  const isNew = role === null;
  const isSuperAdmin = role?.id === SUPER_ADMIN_ROLE_ID;
  const isMine = role !== null && role.id === staff?.roleId;
  const readOnly = isSuperAdmin || isMine;
  const myPermissions = staff?.permissions ?? [];

  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selected, setSelected] = useState<Set<StaffPermission>>(
    () =>
      new Set(
        role?.permissions.includes("*")
          ? ALL_STAFF_PERMISSIONS
          : ((role?.permissions ?? ["dashboard.view"]) as StaffPermission[])
      )
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggle = (key: StaffPermission) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const unchanged = useMemo(() => {
    if (!role) return false;
    const before = new Set(role.permissions);
    return (
      name.trim() === role.name &&
      (description.trim() || null) === (role.description || null) &&
      before.size === selected.size &&
      [...selected].every((p) => before.has(p))
    );
  }, [role, name, description, selected]);

  const save = async () => {
    if (name.trim().length < 2) {
      setError("Give the role a name.");
      return;
    }
    setBusy(true);
    setError(null);
    const body = JSON.stringify({
      name: name.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      permissions: [...selected],
    });
    const result = await runAdminAction(() =>
      isNew
        ? apiFetch("/admin/roles", { method: "POST", body })
        : apiFetch(`/admin/roles/${role!.id}`, { method: "PATCH", body })
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved(
      isNew ? `Role "${name.trim()}" was created.` : `Role "${name.trim()}" was updated.`
    );
  };

  const remove = async () => {
    if (!role) return;
    setBusy(true);
    const result = await runAdminAction(() =>
      apiFetch(`/admin/roles/${role.id}`, { method: "DELETE" })
    );
    setBusy(false);
    if (!result.ok) {
      setConfirmDelete(false);
      setError(result.message);
      return;
    }
    onSaved(`Role "${role.name}" was deleted.`);
  };

  return (
    <Drawer
      open
      onClose={busy ? () => undefined : onClose}
      title={isNew ? "New role" : role!.name}
      subtitle={
        isNew
          ? "Choose exactly what this role can do."
          : `${permissionCount(role!)} · ${plural(role!.staffCount, "staff member")}`
      }
      footer={
        readOnly ? undefined : (
          <div className="flex w-full flex-wrap justify-between gap-2">
            <div>
              {!isNew && !role!.isSystem && (
                <Button
                  variant="danger-outline"
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy}
                >
                  Delete role
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button variant="primary" onClick={save} disabled={busy || unchanged}>
                {busy ? "Saving…" : isNew ? "Create role" : "Save changes"}
              </Button>
            </div>
          </div>
        )
      }
    >
      <FormError message={error} />
      {isSuperAdmin && (
        <Notice tone="blue">
          Super Admins always have every permission, including ones added later. This role
          can&apos;t be changed or deleted.
        </Notice>
      )}
      {isMine && !isSuperAdmin && (
        <Notice tone="amber">
          This is your own role, so another Super Admin has to change it.
        </Notice>
      )}
      {role?.isSystem && !readOnly && (
        <Notice tone="blue">
          Built-in roles keep their name; you can change their permissions.
        </Notice>
      )}

      <div className="space-y-4">
        <Field label="Name" htmlFor="role-name">
          <input
            id="role-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={readOnly || role?.isSystem}
            className={inputClass}
            placeholder="e.g. Placement coordinator"
            data-autofocus
          />
        </Field>
        <Field label="Description (optional)" htmlFor="role-description">
          <input
            id="role-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={readOnly || role?.isSystem}
            className={inputClass}
            placeholder="Who should have this role"
          />
        </Field>
      </div>

      <div className="space-y-5 border-t border-zinc-200 pt-4">
        {PERMISSION_GROUPS.map((group) => (
          <fieldset key={group.group}>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {group.group}
            </legend>
            <div className="space-y-2">
              {group.items.map((key) => {
                const cannotGrant = !hasStaffPermission(myPermissions, key);
                return (
                  <label
                    key={key}
                    className="flex items-start gap-3 text-sm text-zinc-800"
                    title={
                      cannotGrant
                        ? "You can't give a permission you don't have yourself."
                        : undefined
                    }
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(key)}
                      onChange={() => toggle(key)}
                      disabled={readOnly || (cannotGrant && !selected.has(key))}
                      className="mt-0.5"
                    />
                    <span>
                      {STAFF_PERMISSIONS[key].label}
                      {cannotGrant && !readOnly && (
                        <span className="ml-1 text-xs text-zinc-400">
                          (you don&apos;t have this)
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {role && (
        <ConfirmDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={remove}
          title={`Delete the "${role.name}" role?`}
          description={
            role.staffCount > 0
              ? `${plural(role.staffCount, "staff member")} still ${role.staffCount === 1 ? "has" : "have"} this role. Give them another role first.`
              : "This can't be undone."
          }
          confirmLabel="Delete role"
          danger
          busy={busy}
        />
      )}
    </Drawer>
  );
}
