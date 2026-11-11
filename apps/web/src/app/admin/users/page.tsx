"use client";

import { useEffect, useState } from "react";
import { IconUsers } from "../../../components/admin/icons";
import type { AdminUser, Envelope, Paged, Role } from "../../../components/admin/types";
import {
  DataTable,
  EmptyState,
  ExportButton,
  PageHeader,
  Pagination,
  Panel,
  RefreshButton,
  SearchInput,
  SelectField,
  StatusBadge,
  timeAgo,
  type Column,
} from "../../../components/admin/ui";
import { useAdminResource } from "../../../components/admin/useAdminResource";
import { formatDate } from "../../../lib/format";

type RoleFilter = Role | "ALL";

const PAGE_SIZE = 25;

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [page, setPage] = useState(1);

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
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center bg-zinc-100 text-xs font-semibold uppercase text-zinc-600"
          >
            {u.name.trim().charAt(0) || "?"}
          </span>
          <div className="min-w-0 max-w-[16rem]">
            <p className="truncate font-medium text-zinc-900">{u.name}</p>
            {u.organizationName && (
              <p className="truncate text-xs text-zinc-500">{u.organizationName}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (u) => (
        <a
          href={`mailto:${u.email}`}
          className="text-zinc-700 hover:text-blue-700 hover:underline"
        >
          {u.email}
        </a>
      ),
    },
    { key: "role", header: "Role", render: (u) => <StatusBadge status={u.role} /> },
    {
      key: "joined",
      header: "Joined",
      className: "whitespace-nowrap",
      render: (u) => <span title={timeAgo(u.createdAt)}>{formatDate(u.createdAt)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone with a ByteHUB account: students, companies and admins."
        actions={
          <>
            <ExportButton entity="users" />
            <RefreshButton onClick={users.reload} busy={users.loading} />
          </>
        }
      />

      <Panel>
        <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            label="Search users"
            placeholder="Search by name or email"
            value={search}
            onChange={setSearch}
          />
          <SelectField<RoleFilter>
            label="Role"
            value={role}
            onChange={(value) => {
              setRole(value);
              setPage(1);
            }}
            options={[
              { value: "ALL", label: "All roles" },
              { value: "STUDENT", label: "Students" },
              { value: "COMPANY", label: "Companies" },
              { value: "ADMIN", label: "Admins" },
            ]}
          />
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
              title={query || role !== "ALL" ? "No users match" : "No users yet"}
              description={
                query || role !== "ALL"
                  ? "Try a different name, email or role."
                  : "New sign-ups will appear here."
              }
            />
          }
        />
        <Pagination meta={users.data?.meta} onPageChange={setPage} itemLabel="users" />
      </Panel>
    </>
  );
}
